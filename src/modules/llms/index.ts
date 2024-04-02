import { GrammyError } from 'grammy'
import { type Logger, pino } from 'pino'

import { getCommandNamePrompt } from '../1country/utils'
import { type BotPayments } from '../payment'
import {
  type OnMessageContext,
  type OnCallBackQueryData,
  type ChatConversation,
  type ChatPayload,
  type PayableBot,
  type Collection,
  RequestState
} from '../types'
import { appText } from '../open-ai/utils/text'
import { chatService } from '../../database/services'
import config from '../../config'
import { sleep } from '../sd-images/utils'
import {
  addDocToCollection,
  addUrlToCollection,
  getPromptPrice,
  hasBardPrefix,
  hasClaudeOpusPrefix,
  hasGeminiPrefix,
  hasLlamaPrefix,
  hasPrefix,
  hasUrl,
  isMentioned,
  limitPrompt,
  MAX_TRIES,
  SupportedCommands
} from './helpers'
import { getUrlFromText, preparePrompt, sendMessage } from '../open-ai/helpers'
import { vertexCompletion, vertexStreamCompletion } from './api/vertex'
import { type LlmCompletion, llmCompletion, llmCheckCollectionStatus, queryUrlDocument, deleteCollection } from './api/llmApi'
import { LlmsModelsEnum } from './types'
import * as Sentry from '@sentry/node'
import { now } from '../../utils/perf'
import { AxiosError } from 'axios'
import OpenAI from 'openai'
import { anthropicCompletion, anthropicStreamCompletion } from './api/athropic'
export class LlmsBot implements PayableBot {
  public readonly module = 'LlmsBot'
  private readonly logger: Logger
  private readonly payments: BotPayments
  private botSuspended: boolean

  constructor (payments: BotPayments) {
    this.logger = pino({
      name: 'LlmsBot',
      transport: {
        target: 'pino-pretty',
        options: { colorize: true }
      }
    })
    this.botSuspended = false
    this.payments = payments
  }

  public getEstimatedPrice (ctx: any): number {
    return 0
  }

  public isSupportedEvent (
    ctx: OnMessageContext | OnCallBackQueryData
  ): boolean {
    const hasCommand = ctx.hasCommand(
      Object.values(SupportedCommands).map((command) => command)
    )
    if (isMentioned(ctx)) {
      return true
    }
    const chatPrefix = hasPrefix(ctx.message?.text ?? '')
    const hasUrl = this.isSupportedUrlReply(ctx)
    const hasPdf = this.isSupportedPdfReply(ctx)
    if (chatPrefix !== '') {
      return true
    }
    return hasCommand || !!hasUrl || !!hasPdf || this.isSupportedPdfFile(ctx)
  }

  isSupportedPdfReply (ctx: OnMessageContext | OnCallBackQueryData): string | undefined {
    const documentType = ctx.message?.reply_to_message?.document?.mime_type
    if (documentType === 'application/pdf' && ctx.chat?.type === 'private') {
      return ctx.message?.reply_to_message?.document?.file_name
    }
    return undefined
  }

  private isSupportedUrlReply (ctx: OnMessageContext | OnCallBackQueryData): string[] | undefined {
    return getUrlFromText(ctx)
  }

  isSupportedPdfFile (ctx: OnMessageContext | OnCallBackQueryData): boolean {
    const documentType = ctx.message?.document?.mime_type
    const SupportedDocuments = { PDF: 'application/pdf' }
    if (documentType !== undefined && ctx.chat?.type === 'private') {
      return Object.values(SupportedDocuments).includes(documentType)
    }

    return false
  }

  public async onEvent (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    ctx.transient.analytics.module = this.module
    const isSupportedEvent = this.isSupportedEvent(ctx)
    if (!isSupportedEvent && ctx.chat?.type !== 'private') {
      this.logger.warn(`### unsupported command ${ctx.message?.text}`)
      return
    }

    if (hasBardPrefix(ctx.message?.text ?? '') !== '') {
      await this.onPrefix(ctx, LlmsModelsEnum.BISON)
      return
    }

    if (hasLlamaPrefix(ctx.message?.text ?? '') !== '') {
      await this.onCurrentCollection(ctx)
      return
    }

    if (ctx.hasCommand(SupportedCommands.pdf)) {
      await this.onPdfCommand(ctx)
      return
    }

    if (ctx.hasCommand(SupportedCommands.bard) || ctx.hasCommand(SupportedCommands.bardF)) {
      await this.onChat(ctx, LlmsModelsEnum.BISON)
      return
    }
    if (ctx.hasCommand([SupportedCommands.gemini, SupportedCommands.gShort]) || (hasGeminiPrefix(ctx.message?.text ?? '') !== '')) {
      await this.onChat(ctx, LlmsModelsEnum.GEMINI)
      return
    }
    if (ctx.hasCommand([SupportedCommands.claudeOpus, SupportedCommands.opus, SupportedCommands.opusShort, SupportedCommands.claudeShort]) || (hasClaudeOpusPrefix(ctx.message?.text ?? '') !== '')) {
      await this.onChat(ctx, LlmsModelsEnum.CLAUDE_OPUS)
      return
    }
    if (ctx.hasCommand([SupportedCommands.claudeSonnet, SupportedCommands.sonnet, SupportedCommands.sonnetShort])) {
      await this.onChat(ctx, LlmsModelsEnum.CLAUDE_SONNET)
      return
    }
    if (ctx.hasCommand([SupportedCommands.claudeHaiku, SupportedCommands.haikuShort])) {
      await this.onChat(ctx, LlmsModelsEnum.CLAUDE_HAIKU)
      return
    }
    if (ctx.hasCommand(SupportedCommands.bard) || ctx.hasCommand(SupportedCommands.bardF)) {
      await this.onChat(ctx, LlmsModelsEnum.BISON)
      return
    }

    if (this.isSupportedUrlReply(ctx)) {
      await this.onUrlReplyHandler(ctx)
      return
    }

    if (this.isSupportedPdfReply(ctx)) {
      await this.onPdfReplyHandler(ctx)
      return
    }

    if (this.isSupportedPdfFile(ctx)) {
      await this.onPdfFileReceived(ctx)
      return
    }

    if (ctx.hasCommand(SupportedCommands.j2Ultra)) {
      await this.onChat(ctx, LlmsModelsEnum.J2_ULTRA)
      return
    }

    if (ctx.hasCommand(SupportedCommands.ctx)) {
      await this.onCurrentCollection(ctx)
      return
    }

    if (ctx.hasCommand(SupportedCommands.sum) ||
      (ctx.message?.text?.startsWith('sum ') && ctx.chat?.type === 'private')
    ) {
      await this.onSum(ctx)
      return
    }
    ctx.transient.analytics.actualResponseTime = now()
  }

  private async hasBalance (ctx: OnMessageContext | OnCallBackQueryData): Promise<boolean> {
    const accountId = this.payments.getAccountId(ctx)
    const addressBalance = await this.payments.getUserBalance(accountId)
    const { totalCreditsAmount } = await chatService.getUserCredits(accountId)
    const balance = addressBalance.plus(totalCreditsAmount)
    const balanceOne = this.payments.toONE(balance, false).toFixed(2)
    return (
      +balanceOne > +config.llms.minimumBalance ||
      (this.payments.isUserInWhitelist(ctx.from.id, ctx.from.username))
    )
  }

  private async onPdfFileReceived (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    try {
      const file = await ctx.getFile()
      const documentType = ctx.message?.document?.mime_type
      if (documentType === 'application/pdf' && ctx.chat?.id && ctx.chat.type === 'private') {
        const url = file.getUrl()
        const fileName = ctx.message?.document?.file_name ?? file.file_id
        const prompt = ctx.message?.caption ?? 'Summarize this context' //  from the PDF file
        await addDocToCollection(ctx, ctx.chat.id, fileName, url, prompt)
        if (!ctx.session.collections.isProcessingQueue) {
          ctx.session.collections.isProcessingQueue = true
          await this.onCheckCollectionStatus(ctx).then(() => {
            ctx.session.collections.isProcessingQueue = false
          })
        }
      }
      ctx.transient.analytics.sessionState = RequestState.Success
    } catch (ex) {
      await this.onError(ctx, ex)
    } finally {
      ctx.transient.analytics.actualResponseTime = now()
    }
  }

  async onPdfCommand (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    try {
      const documentType = ctx.message?.reply_to_message?.document?.mime_type
      if (documentType !== 'application/pdf' && ctx.chat?.type === 'private') {
        return
      }
      const filename = ctx.message?.reply_to_message?.document?.file_name ?? ''
      let prompt = ''
      if (ctx.match) {
        prompt = ctx.match as string
      } else {
        prompt = 'Summarize this context from the PDF file'
      }
      if (filename !== '' && ctx.chat?.id) {
        const collection = ctx.session.collections.activeCollections.find(c => c.fileName === filename)
        if (collection) {
          await this.queryUrlCollection(ctx, collection.url, prompt)
        } else {
          const fileId = ctx.message?.reply_to_message?.document?.file_id
          const file = await ctx.api.getFile(fileId ?? '')
          const url = file.getUrl()
          await addDocToCollection(ctx, ctx.chat.id, filename, url, prompt)
          if (!ctx.session.collections.isProcessingQueue) {
            ctx.session.collections.isProcessingQueue = true
            await this.onCheckCollectionStatus(ctx).then(() => {
              ctx.session.collections.isProcessingQueue = false
            })
          }
        }
      }
      ctx.transient.analytics.actualResponseTime = now()
    } catch (e: any) {
      await this.onError(ctx, e)
    }
  }

  async onPdfReplyHandler (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    try {
      const fileName = this.isSupportedPdfReply(ctx)
      const prompt = ctx.message?.text ?? 'Summarize this context'
      if (fileName !== '') {
        const collection = ctx.session.collections.activeCollections.find(c => c.fileName === fileName)
        if (collection) {
          await this.queryUrlCollection(ctx, collection.url, prompt)
        }
      }
      ctx.transient.analytics.actualResponseTime = now()
    } catch (e: any) {
      await this.onError(ctx, e)
    }
  }

  async onUrlReplyHandler (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    try {
      const url = getUrlFromText(ctx)
      if (url) {
        const prompt = ctx.message?.text ?? 'summarize'
        const collection = ctx.session.collections.activeCollections.find(c => c.url === url[0])
        const newPrompt = `${prompt}` // ${url}
        if (collection) {
          await this.queryUrlCollection(ctx, url[0], newPrompt)
        }
        ctx.transient.analytics.actualResponseTime = now()
      }
    } catch (e: any) {
      await this.onError(ctx, e)
    }
  }

  private getCollectionConversation (ctx: OnMessageContext | OnCallBackQueryData, collection: Collection): ChatConversation[] {
    if (ctx.session.collections.currentCollection === collection.collectionName) {
      return ctx.session.collections.collectionConversation
    }
    ctx.session.collections.currentCollection = collection.collectionName
    return []
  }

  private async onCurrentCollection (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    try {
      let prompt = ''
      if (ctx.match) {
        prompt = ctx.match as string
      } else {
        const prefix = hasLlamaPrefix(ctx.message?.text ?? '')
        if (prefix && ctx.message?.text) {
          prompt = ctx.message?.text.slice(prefix.length)
        } else {
          prompt = 'Summarize this context'
        }
      }
      const collectionName = ctx.session.collections.currentCollection
      const collection = ctx.session.collections.activeCollections.find(c => c.collectionName === collectionName)
      if (collection && collectionName) {
        const conversation = ctx.session.collections.collectionConversation
        const msgId = (
          await ctx.reply('...', {
            message_thread_id:
              ctx.message?.message_thread_id ??
              ctx.message?.reply_to_message?.message_thread_id
          })
        ).message_id
        const response = await queryUrlDocument({
          collectioName: collection.collectionName,
          prompt,
          conversation
        })
        const price = response.price * config.openAi.chatGpt.priceAdjustment
        if (
          !(await this.payments.pay(ctx as OnMessageContext, price))
        ) {
          await this.onNotBalanceMessage(ctx)
        } else {
          conversation.push({
            content: `${prompt} ${collection.url}`,
            role: 'user'
          }, {
            content: response.completion,
            role: 'assistant'
          })
          await ctx.api.editMessageText(ctx.chat?.id ?? '',
            msgId, response.completion,
            { disable_web_page_preview: true })
            .catch(async (e) => { await this.onError(ctx, e) })
          ctx.session.collections.collectionConversation = [...conversation]
        }
      } else {
        await sendMessage(ctx, 'There is no active collection (url/pdf file)')
      }
    } catch (e: any) {
      Sentry.captureException(e)
      ctx.transient.analytics.sessionState = RequestState.Error
      if (e instanceof AxiosError) {
        if (e.message.includes('404')) {
          ctx.session.collections.activeCollections =
            [...ctx.session.collections.activeCollections.filter(c => c.collectionName !==
              ctx.session.collections.currentCollection)]
          await sendMessage(ctx, 'Collection not found, please try again')
          return
        }
      }
      await this.onError(ctx, e)
    }
  }

  private async queryUrlCollection (ctx: OnMessageContext | OnCallBackQueryData,
    url: string,
    prompt: string): Promise<void> {
    try {
      const collection = ctx.session.collections.activeCollections.find(c => c.url === url)
      if (collection) {
        const conversation = this.getCollectionConversation(ctx, collection)
        if (conversation.length === 0) {
          conversation.push({
            role: 'system',
            content: `${collection.collectionType === 'PDF' ? 'The context comes from an URL linked to a PDF file' : 'The context comes from the web crawler of the given URL'}`
          })
        }
        const msgId = (
          await ctx.reply('...', {
            message_thread_id:
              ctx.message?.message_thread_id ??
              ctx.message?.reply_to_message?.message_thread_id
          })
        ).message_id
        const response = await queryUrlDocument({
          collectioName: collection.collectionName,
          prompt,
          conversation
        })
        const price = response.price * config.openAi.chatGpt.priceAdjustment
        if (
          !(await this.payments.pay(ctx as OnMessageContext, price))
        ) {
          if (ctx.chat?.id) {
            await ctx.api.deleteMessage(ctx.chat?.id, msgId)
          }
          await this.onNotBalanceMessage(ctx)
        } else {
          conversation.push({
            content: `${prompt} ${url}`,
            role: 'user'
          }, {
            content: response.completion,
            role: 'assistant'
          })
          await ctx.api.editMessageText(ctx.chat?.id ?? '',
            msgId, response.completion,
            { parse_mode: 'Markdown', disable_web_page_preview: true })
          ctx.session.collections.collectionConversation = [...conversation]
        }
      }
      ctx.transient.analytics.actualResponseTime = now()
    } catch (e: any) {
      Sentry.captureException(e)
      ctx.transient.analytics.sessionState = RequestState.Error
      if (e instanceof GrammyError && e.error_code === 400 &&
        (e.description.includes('MESSAGE_TOO_LONG') || e.description.includes('find end of the entity starting at byte offset'))) {
        await sendMessage(
          ctx,
          'Error: Completion message too long. Please try again'
        )
        ctx.session.collections.collectionConversation = []
        ctx.transient.analytics.actualResponseTime = now()
      } else if (e instanceof AxiosError) {
        if (e.message.includes('404')) {
          ctx.session.collections.activeCollections =
            [...ctx.session.collections.activeCollections.filter(c => c.url !== url.toLocaleLowerCase())]
          await sendMessage(ctx, 'Collection not found, please try again')
        } else {
          await this.onError(ctx, e)
        }
      } else {
        await this.onError(ctx, e)
      }
    }
  }

  async onCheckCollectionStatus (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    const processingTime = config.llms.processingTime
    while (ctx.session.collections.collectionRequestQueue.length > 0) {
      try {
        const collection = ctx.session.collections.collectionRequestQueue.shift()
        if (collection) {
          const result = await llmCheckCollectionStatus(collection?.collectionName ?? '')
          if (result.price > 0) {
            if (
              !(await this.payments.pay(ctx as OnMessageContext, result.price)) // price 0.05 x collections (chunks)
            ) {
              await this.onNotBalanceMessage(ctx)
            } else {
              ctx.session.collections.activeCollections.push(collection)
              if (collection.msgId) {
                const oneFee = await this.payments.getPriceInONE(result.price) // price in cents
                let statusMsg
                if (collection.collectionType === 'URL') {
                  statusMsg = `${collection.url} processed (${this.payments.toONE(oneFee, false).toFixed(2)} ONE fee)`
                } else {
                  statusMsg = `${collection.fileName} processed (${this.payments.toONE(oneFee, false).toFixed(2)} ONE fee)`
                }
                await ctx.api.editMessageText(ctx.chat?.id ?? '',
                  collection.msgId, statusMsg,
                  { disable_web_page_preview: true })
                  .catch(async (e) => { await this.onError(ctx, e) })
              }
              await this.queryUrlCollection(ctx, collection.url ?? '',
                collection.prompt ?? 'summary')
            }
          } else if (result.price < 0) {
            if (collection.msgId) {
              let statusMsg = ''
              if (collection.collectionType === 'URL') {
                statusMsg = `${collection.url} - Invalid URL`
              } else {
                statusMsg = `${collection.fileName} - Invalid PDF format`
              }
              await ctx.api.editMessageText(ctx.chat?.id ?? '', collection.msgId, statusMsg,
                { disable_web_page_preview: true })
            }
          } else {
            if (collection.processingTime && collection.processingTime > processingTime) { // 5 min max
              if (collection.msgId) {
                let statusMsg = ''
                if (collection.collectionType === 'URL') {
                  statusMsg = `${collection.url} - Processing time limit reached. Please check the file format and try again`
                } else {
                  statusMsg = `${collection.fileName} - Processing time limit reached. Please check the file format and try again`
                }
                await ctx.api.editMessageText(ctx.chat?.id ?? '', collection.msgId, statusMsg,
                  { disable_web_page_preview: true })
              }
            } else {
              const processingTime = collection.processingTime ? collection.processingTime + 5000 : 5000
              ctx.session.collections.collectionRequestQueue.push({ ...collection, processingTime })
              if (ctx.session.collections.collectionRequestQueue.length === 1) {
                await sleep(6000)
              } else {
                await sleep(3000)
              }
            }
          }
        }
        ctx.transient.analytics.actualResponseTime = now()
      } catch (e: any) {
        await this.onError(ctx, e)
      }
    }
  }

  async onSum (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    if (this.botSuspended) {
      ctx.transient.analytics.sessionState = RequestState.Error
      await sendMessage(ctx, 'The bot is suspended').catch(async (e) => {
        await this.onError(ctx, e)
      })
      ctx.transient.analytics.actualResponseTime = now()
      return
    }
    try {
      const { prompt } = getCommandNamePrompt(ctx, SupportedCommands)
      const newPrompt = prompt !== '' ? prompt : 'Summarize this context'
      const { url } = hasUrl(ctx, prompt)
      if (url && ctx.chat?.id) {
        await this.urlHandler(ctx, url, newPrompt)
      } else {
        ctx.transient.analytics.sessionState = RequestState.Error
        await sendMessage(ctx, 'Error: Missing url').catch(async (e) => {
          await this.onError(ctx, e)
        })
        ctx.transient.analytics.actualResponseTime = now()
      }
    } catch (e) {
      await this.onError(ctx, e)
    }
  }

  public async urlHandler (ctx: OnMessageContext | OnCallBackQueryData, url: string, prompt: string): Promise<void> {
    const collection = ctx.session.collections.activeCollections.find(c => c.url === url.toLocaleLowerCase())
    if (ctx.chat?.id) {
      if (!collection) {
        await addUrlToCollection(ctx, ctx.chat?.id, url, prompt)
        if (!ctx.session.collections.isProcessingQueue) {
          ctx.session.collections.isProcessingQueue = true
          await this.onCheckCollectionStatus(ctx).then(() => {
            ctx.session.collections.isProcessingQueue = false
          })
        }
      } else {
        await this.queryUrlCollection(ctx, url, prompt)
      }
    }
    ctx.transient.analytics.actualResponseTime = now()
  }

  private async completionGen (data: ChatPayload, msgId?: number, outputFormat = 'text'): Promise< { price: number, chat: ChatConversation[] }> {
    const { conversation, ctx, model } = data
    try {
      if (!msgId) {
        ctx.transient.analytics.firstResponseTime = now()
        msgId = (
          await ctx.reply('...', {
            message_thread_id:
              ctx.message?.message_thread_id ??
              ctx.message?.reply_to_message?.message_thread_id
          })
        ).message_id
      }
      if (outputFormat === 'text') {
        const isTypingEnabled = config.openAi.chatGpt.isTypingEnabled
        if (isTypingEnabled) {
          ctx.chatAction = 'typing'
        }
        let completion: LlmCompletion
        if (model === LlmsModelsEnum.GEMINI) {
          completion = await vertexStreamCompletion(conversation,
            model as LlmsModelsEnum,
            ctx,
            msgId,
            true // telegram messages has a character limit
          )
        } else {
          completion = await anthropicStreamCompletion(
            conversation,
            model as LlmsModelsEnum,
            ctx,
            msgId,
            true // telegram messages has a character limit
          )
        }
        if (isTypingEnabled) {
          ctx.chatAction = null
        }
        if (completion) {
          ctx.transient.analytics.sessionState = RequestState.Success
          ctx.transient.analytics.actualResponseTime = now()
          const price = getPromptPrice(completion, data)
          this.logger.info(
            `streamChatCompletion result = tokens: ${price.promptTokens + price.completionTokens} | ${model} | price: ${price.price}¢` //   }
          )
          conversation.push({
            role: 'assistant',
            content: completion.completion?.content ?? '',
            model
          })
          return {
            price: price.price,
            chat: conversation
          }
        }
      } else {
        const response = await anthropicCompletion(conversation, model as LlmsModelsEnum)
        conversation.push({
          role: 'assistant',
          content: response.completion?.content ?? '',
          model
        })
        return {
          price: response.price,
          chat: conversation
        }
      }
      return {
        price: 0,
        chat: conversation
      }
    } catch (e: any) {
      Sentry.captureException(e)
      ctx.chatAction = null
      throw e
    }
  }

  private async promptGen (data: ChatPayload): Promise<{ price: number, chat: ChatConversation[] }> {
    const { conversation, ctx, model } = data
    if (!ctx.chat?.id) {
      throw new Error('internal error')
    }
    const msgId = (
      await ctx.reply('...', { message_thread_id: ctx.message?.message_thread_id })
    ).message_id
    ctx.chatAction = 'typing'
    let response: LlmCompletion = {
      completion: undefined,
      usage: 0,
      price: 0
    }
    if (model === LlmsModelsEnum.BISON) {
      response = await vertexCompletion(conversation, model) // "chat-bison@001");
    } else if (model === LlmsModelsEnum.CLAUDE_OPUS || model === LlmsModelsEnum.CLAUDE_SONNET || model === LlmsModelsEnum.CLAUDE_HAIKU) {
      response = await anthropicCompletion(conversation, model)
    } else {
      response = await llmCompletion(conversation, model as LlmsModelsEnum)
    }
    if (response.completion) {
      await ctx.api.editMessageText(
        ctx.chat.id,
        msgId,
        response.completion.content as string
      )
      conversation.push(response.completion)
      // const price = getPromptPrice(completion, data);
      // this.logger.info(
      //   `streamChatCompletion result = tokens: ${
      //     price.promptTokens + price.completionTokens
      //   } | ${model} | price: ${price}¢`
      // );
      return {
        price: 0,
        chat: conversation
      }
    }
    // ctx.chatAction = null
    ctx.transient.analytics.actualResponseTime = now()
    return {
      price: 0,
      chat: conversation
    }
  }

  async onPrefix (ctx: OnMessageContext | OnCallBackQueryData, model: string): Promise<void> {
    try {
      if (this.botSuspended) {
        ctx.transient.analytics.sessionState = RequestState.Error
        sendMessage(ctx, 'The bot is suspended').catch(async (e) => { await this.onError(ctx, e) })
        ctx.transient.analytics.actualResponseTime = now()
        return
      }
      const { prompt } = getCommandNamePrompt(
        ctx,
        SupportedCommands
      )
      const prefix = hasPrefix(prompt)
      ctx.session.llms.requestQueue.push({
        content: await preparePrompt(ctx, prompt.slice(prefix.length)),
        model
      })
      if (!ctx.session.llms.isProcessingQueue) {
        ctx.session.llms.isProcessingQueue = true
        await this.onChatRequestHandler(ctx).then(() => {
          ctx.session.llms.isProcessingQueue = false
        })
      }
    } catch (e) {
      await this.onError(ctx, e)
    }
  }

  async onChat (ctx: OnMessageContext | OnCallBackQueryData, model: string): Promise<void> {
    try {
      if (this.botSuspended) {
        ctx.transient.analytics.sessionState = RequestState.Error
        sendMessage(ctx, 'The bot is suspended').catch(async (e) => { await this.onError(ctx, e) })
        ctx.transient.analytics.actualResponseTime = now()
        return
      }
      const prompt = ctx.match ? ctx.match : ctx.message?.text
      ctx.session.llms.requestQueue.push({
        model,
        content: await preparePrompt(ctx, prompt as string)
      })
      if (!ctx.session.llms.isProcessingQueue) {
        ctx.session.llms.isProcessingQueue = true
        await this.onChatRequestHandler(ctx).then(() => {
          ctx.session.llms.isProcessingQueue = false
        })
      }
      ctx.transient.analytics.actualResponseTime = now()
    } catch (e: any) {
      await this.onError(ctx, e)
    }
  }

  async onChatRequestHandler (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    while (ctx.session.llms.requestQueue.length > 0) {
      try {
        const msg = ctx.session.llms.requestQueue.shift()
        const prompt = msg?.content as string
        const model = msg?.model
        const { chatConversation } = ctx.session.llms
        if (await this.hasBalance(ctx)) {
          if (!prompt) {
            const msg =
              chatConversation.length > 0
                ? `${appText.gptLast}\n_${
                    chatConversation[chatConversation.length - 1].content
                  }_`
                : appText.introText
            ctx.transient.analytics.sessionState = RequestState.Success
            await sendMessage(ctx, msg, { parseMode: 'Markdown' }).catch(async (e) => {
              await this.onError(ctx, e)
            })
            ctx.transient.analytics.actualResponseTime = now()
            return
          }
          const chat: ChatConversation = {
            content: limitPrompt(prompt),
            role: 'user',
            model
          }
          chatConversation.push(chat)
          const payload = {
            conversation: chatConversation,
            model: model ?? config.llms.model,
            ctx
          }
          let result: { price: number, chat: ChatConversation[] } = { price: 0, chat: [] }
          if (model === LlmsModelsEnum.CLAUDE_OPUS || model === LlmsModelsEnum.CLAUDE_SONNET || model === LlmsModelsEnum.GEMINI) {
            result = await this.completionGen(payload) // , prompt.msgId, prompt.outputFormat)
          } else {
            result = await this.promptGen(payload)
          }
          ctx.session.llms.chatConversation = [...result.chat]
          if (
            !(await this.payments.pay(ctx as OnMessageContext, result.price))
          ) {
            await this.onNotBalanceMessage(ctx)
          }
          ctx.chatAction = null
        } else {
          await this.onNotBalanceMessage(ctx)
        }
      } catch (e: any) {
        ctx.session.llms.chatConversation = []
        await this.onError(ctx, e)
      }
    }
  }

  async onStop (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    for (const c of ctx.session.collections.activeCollections) {
      this.logger.info(`Deleting collection ${c.collectionName}`)
      await deleteCollection(c.collectionName)
    }
    ctx.session.collections.activeCollections = []
    ctx.session.collections.collectionConversation = []
    ctx.session.collections.collectionRequestQueue = []
    ctx.session.collections.currentCollection = ''
    ctx.session.collections.isProcessingQueue = false
    ctx.session.llms.chatConversation = []
    ctx.session.llms.usage = 0
    ctx.session.llms.price = 0
  }

  async onNotBalanceMessage (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    const accountId = this.payments.getAccountId(ctx)
    const account = this.payments.getUserAccount(accountId)
    const addressBalance = await this.payments.getUserBalance(accountId)
    const { totalCreditsAmount } = await chatService.getUserCredits(accountId)
    const balance = addressBalance.plus(totalCreditsAmount)
    const balanceOne = this.payments.toONE(balance, false).toFixed(2)
    const balanceMessage = appText.notEnoughBalance
      .replaceAll('$CREDITS', balanceOne)
      .replaceAll('$WALLET_ADDRESS', account?.address ?? '')
    ctx.transient.analytics.sessionState = RequestState.Success
    await sendMessage(ctx, balanceMessage, { parseMode: 'Markdown' }).catch(async (e) => { await this.onError(ctx, e) })
    ctx.transient.analytics.actualResponseTime = now()
  }

  async onError (
    ctx: OnMessageContext | OnCallBackQueryData,
    e: any,
    retryCount: number = MAX_TRIES,
    msg?: string
  ): Promise<void> {
    ctx.transient.analytics.sessionState = RequestState.Error
    Sentry.setContext('llms', { retryCount, msg })
    Sentry.captureException(e)
    ctx.chatAction = null
    if (retryCount === 0) {
      // Retry limit reached, log an error or take alternative action
      this.logger.error(`Retry limit reached for error: ${e}`)
      return
    }
    if (e instanceof GrammyError) {
      if (e.error_code === 400 && e.description.includes('not enough rights')) {
        await sendMessage(
          ctx,
          'Error: The bot does not have permission to send photos in chat'
        )
        ctx.transient.analytics.actualResponseTime = now()
      } else if (e.error_code === 429) {
        this.botSuspended = true
        const retryAfter = e.parameters.retry_after
          ? e.parameters.retry_after < 60
            ? 60
            : e.parameters.retry_after * 2
          : 60
        const method = e.method
        const errorMessage = `On method "${method}" | ${e.error_code} - ${e.description}`
        this.logger.error(errorMessage)
        await sendMessage(
          ctx,
          `${
            ctx.from.username ? ctx.from.username : ''
          } Bot has reached limit, wait ${retryAfter} seconds`
        ).catch(async (e) => { await this.onError(ctx, e, retryCount - 1) })
        ctx.transient.analytics.actualResponseTime = now()
        if (method === 'editMessageText') {
          ctx.session.llms.chatConversation.pop() // deletes last prompt
        }
        await sleep(retryAfter * 1000) // wait retryAfter seconds to enable bot
        this.botSuspended = false
      } else {
        this.logger.error(
          `On method "${e.method}" | ${e.error_code} - ${e.description}`
        )
        ctx.transient.analytics.actualResponseTime = now()
        await sendMessage(ctx, 'Error handling your request').catch(async (e) => { await this.onError(ctx, e, retryCount - 1) })
      }
    } else if (e instanceof OpenAI.APIError) {
      // 429 RateLimitError
      // e.status = 400 || e.code = BadRequestError
      this.logger.error(`OPENAI Error ${e.status}(${e.code}) - ${e.message}`)
      if (e.code === 'context_length_exceeded') {
        await sendMessage(ctx, e.message).catch(async (e) => { await this.onError(ctx, e, retryCount - 1) })
        ctx.transient.analytics.actualResponseTime = now()
        await this.onStop(ctx)
      } else {
        await sendMessage(
          ctx,
          'Error accessing OpenAI (ChatGPT). Please try later'
        ).catch(async (e) => { await this.onError(ctx, e, retryCount - 1) })
        ctx.transient.analytics.actualResponseTime = now()
      }
    } else if (e instanceof AxiosError) {
      this.logger.error(`${e.message}`)
      await sendMessage(ctx, 'Error handling your request').catch(async (e) => {
        await this.onError(ctx, e, retryCount - 1)
      })
    } else {
      this.logger.error(`${e.toString()}`)
      await sendMessage(ctx, 'Error handling your request')
        .catch(async (e) => { await this.onError(ctx, e, retryCount - 1) }
        )
      ctx.transient.analytics.actualResponseTime = now()
    }
  }
}
