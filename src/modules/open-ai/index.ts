import { GrammyError, InlineKeyboard } from 'grammy'
import OpenAI from 'openai'
import { type Logger, pino } from 'pino'

import { getCommandNamePrompt } from '../1country/utils'
import { type BotPayments } from '../payment'
import {
  type ChatConversation,
  type ChatPayload,
  type OnCallBackQueryData,
  type OnMessageContext,
  type PayableBot,
  RequestState
} from '../types'
import {
  alterGeneratedImg,
  chatCompletion,
  getChatModel,
  getDalleModel,
  getDalleModelPrice,
  postGenerateImg,
  streamChatCompletion
} from './api/openAi'
import { appText } from './utils/text'
import { chatService } from '../../database/services'
import { ChatGPTModelsEnum } from './types'
import config from '../../config'
import { sleep } from '../sd-images/utils'
import {
  getMessageExtras,
  getPromptPrice,
  hasChatPrefix,
  hasNewPrefix,
  hasPrefix,
  hasUrl,
  hasUsernamePassword,
  isMentioned,
  MAX_TRIES,
  preparePrompt,
  sendMessage,
  SupportedCommands
} from './helpers'
import { getCrawlerPrice, getWebContent } from './utils/web-crawler'
import * as Sentry from '@sentry/node'
import { now } from '../../utils/perf'
import { Callbacks } from '../types'

export class OpenAIBot implements PayableBot {
  public readonly module = 'OpenAIBot'
  private readonly logger: Logger
  private readonly payments: BotPayments
  private botSuspended: boolean

  constructor (payments: BotPayments) {
    this.logger = pino({
      name: 'OpenAIBot',
      transport: {
        target: 'pino-pretty',
        options: { colorize: true }
      }
    })
    this.botSuspended = false
    this.payments = payments
    if (!config.openAi.dalle.isEnabled) {
      this.logger.warn('DALL·E 2 Image Bot is disabled in config')
    }
  }

  public isSupportedEvent (
    ctx: OnMessageContext | OnCallBackQueryData
  ): boolean {
    const hasCommand = ctx.hasCommand(
      Object.values(SupportedCommands).map((command) => command.name)
    )
    if (isMentioned(ctx)) {
      return true
    }
    const hasReply = this.isSupportedImageReply(ctx)
    const chatPrefix = hasPrefix(ctx.message?.text ?? '')
    if (chatPrefix !== '') {
      return true
    }
    return hasCommand || hasReply
  }

  public getEstimatedPrice (ctx: any): number {
    try {
      const priceAdjustment = config.openAi.chatGpt.priceAdjustment
      const prompts = ctx.match
      if (this.isSupportedImageReply(ctx)) {
        const imageNumber = ctx.message?.caption || ctx.message?.text
        const imageSize = ctx.session.openAi.imageGen.imgSize
        const model = getDalleModel(imageSize)
        const price = getDalleModelPrice(model, true, imageNumber) // cents
        return price * priceAdjustment
      }
      if (!prompts) {
        return 0
      }
      if (
        ctx.hasCommand(SupportedCommands.dalle.name) ||
        ctx.hasCommand(SupportedCommands.dalleLC.name)
      ) {
        const imageNumber = ctx.session.openAi.imageGen.numImages
        const imageSize = ctx.session.openAi.imageGen.imgSize
        const model = getDalleModel(imageSize)
        const price = getDalleModelPrice(model, true, imageNumber) // cents
        return price * priceAdjustment
      }
      if (ctx.hasCommand(SupportedCommands.genImgEn.name)) {
        const imageNumber = ctx.session.openAi.imageGen.numImages
        const imageSize = ctx.session.openAi.imageGen.imgSize
        const chatModelName = ctx.session.openAi.chatGpt.model
        const chatModel = getChatModel(chatModelName)
        const model = getDalleModel(imageSize)
        const price = getDalleModelPrice(
          model,
          true,
          imageNumber,
          true,
          chatModel
        ) // cents
        return price * priceAdjustment
      }
      return 0
    } catch (e) {
      Sentry.captureException(e)
      this.logger.error(`getEstimatedPrice error ${e}`)
      throw e
    }
  }

  isSupportedImageReply (ctx: OnMessageContext | OnCallBackQueryData): boolean {
    const photo = ctx.message?.photo ?? ctx.message?.reply_to_message?.photo
    if (photo && ctx.session.openAi.imageGen.isEnabled) {
      const prompt = ctx.message?.caption ?? ctx.message?.text
      if (prompt && !isNaN(+prompt)) {
        return true
      }
    }
    return false
  }

  public async onEvent (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    ctx.transient.analytics.module = this.module
    if (!(this.isSupportedEvent(ctx)) && (ctx.chat?.type !== 'private') && !ctx.session.openAi.chatGpt.isFreePromptChatGroups) {
      ctx.transient.analytics.sessionState = RequestState.Error
      this.logger.warn(`### unsupported command ${ctx.message?.text}`)
      return
    }

    ctx.transient.analytics.sessionState = RequestState.Success
    if (
      ctx.hasCommand(SupportedCommands.chat.name) ||
      (ctx.message?.text?.startsWith('chat ') && ctx.chat?.type === 'private')
    ) {
      ctx.session.openAi.chatGpt.model = ChatGPTModelsEnum.GPT_4
      await this.onChat(ctx)
      return
    }

    if (
      ctx.hasCommand(SupportedCommands.new.name) ||
      (ctx.message?.text?.startsWith('new ') && ctx.chat?.type === 'private')
    ) {
      ctx.session.openAi.chatGpt.model = ChatGPTModelsEnum.GPT_4
      await this.onEnd(ctx)
      await this.onChat(ctx)
      return
    }

    if (
      ctx.hasCommand(SupportedCommands.ask.name) ||
      (ctx.message?.text?.startsWith('ask ') && ctx.chat?.type === 'private')
    ) {
      ctx.session.openAi.chatGpt.model = ChatGPTModelsEnum.GPT_4
      await this.onChat(ctx)
      return
    }

    if (ctx.hasCommand(SupportedCommands.ask35.name)) {
      ctx.session.openAi.chatGpt.model = ChatGPTModelsEnum.GPT_35_TURBO_16K
      await this.onChat(ctx)
      return
    }

    if (ctx.hasCommand(SupportedCommands.gpt4.name)) {
      ctx.session.openAi.chatGpt.model = ChatGPTModelsEnum.GPT_4
      await this.onChat(ctx)
      return
    }

    if (ctx.hasCommand(SupportedCommands.gpt.name)) {
      ctx.session.openAi.chatGpt.model = ChatGPTModelsEnum.GPT_4
      await this.onChat(ctx)
      return
    }

    if (ctx.hasCommand(SupportedCommands.ask32.name)) {
      ctx.session.openAi.chatGpt.model = ChatGPTModelsEnum.GPT_4_32K
      await this.onChat(ctx)
      return
    }

    if (
      ctx.hasCommand(SupportedCommands.dalle.name) ||
      ctx.hasCommand(SupportedCommands.dalleLC.name) ||
      (ctx.message?.text?.startsWith('dalle ') && ctx.chat?.type === 'private')
    ) {
      await this.onGenImgCmd(ctx)
      return
    }

    // if (ctx.hasCommand(SupportedCommands.genImgEn.name)) {
    //   this.onGenImgEnCmd(ctx);
    //   return;
    // }

    if (this.isSupportedImageReply(ctx)) {
      await this.onAlterImage(ctx)
      return
    }

    if (
      ctx.hasCommand(SupportedCommands.sum.name) ||
      (ctx.message?.text?.startsWith('sum ') && ctx.chat?.type === 'private')
    ) {
      await this.onSum(ctx)
      return
    }
    if (ctx.hasCommand(SupportedCommands.last.name)) {
      await this.onLast(ctx)
      return
    }

    if (hasNewPrefix(ctx.message?.text ?? '') !== '') {
      await this.onEnd(ctx)
      await this.onPrefix(ctx)
      return
    }

    if (hasChatPrefix(ctx.message?.text ?? '') !== '') {
      await this.onPrefix(ctx)
      return
    }

    if (isMentioned(ctx)) {
      await this.onMention(ctx)
      return
    }

    if (ctx.chat?.type === 'private' || ctx.session.openAi.chatGpt.isFreePromptChatGroups) {
      await this.onPrivateChat(ctx)
      return
    }

    this.logger.warn('### unsupported command')
    ctx.transient.analytics.sessionState = RequestState.Error
    await sendMessage(ctx, '### unsupported command')
      .catch(async (e) => {
        await this.onError(ctx, e, MAX_TRIES, '### unsupported command')
      })
    ctx.transient.analytics.actualResponseTime = now()
  }

  private async hasBalance (ctx: OnMessageContext | OnCallBackQueryData): Promise<boolean> {
    const accountId = this.payments.getAccountId(ctx)
    const addressBalance = await this.payments.getUserBalance(accountId)
    const { totalCreditsAmount } = await chatService.getUserCredits(accountId)
    const balance = addressBalance.plus(totalCreditsAmount)
    const balanceOne = this.payments.toONE(balance, false)
    return (
      (+balanceOne > +config.openAi.chatGpt.minimumBalance) ||
      (this.payments.isUserInWhitelist(ctx.from.id, ctx.from.username))
    )
  }

  onGenImgCmd = async (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> => {
    try {
      if (ctx.session.openAi.imageGen.isEnabled) {
        let prompt = (ctx.match ? ctx.match : ctx.message?.text) as string
        if (!prompt || prompt.split(' ').length === 1) {
          prompt = config.openAi.dalle.defaultPrompt
        }
        ctx.chatAction = 'upload_photo'
        const numImages = ctx.session.openAi.imageGen.numImages
        const imgSize = ctx.session.openAi.imageGen.imgSize
        const imgs = await postGenerateImg(prompt, numImages, imgSize)
        const msgExtras = getMessageExtras({ caption: `/dalle ${prompt}` })
        await Promise.all(imgs.map(async (img: any) => {
          await ctx.replyWithPhoto(img.url, msgExtras).catch(async (e) => {
            await this.onError(ctx, e, MAX_TRIES)
          })
        }))
        ctx.transient.analytics.sessionState = RequestState.Success
        ctx.transient.analytics.actualResponseTime = now()
      } else {
        ctx.transient.analytics.sessionState = RequestState.Error
        await sendMessage(ctx, 'Bot disabled').catch(async (e) => {
          await this.onError(ctx, e, MAX_TRIES, 'Bot disabled')
        })
        ctx.transient.analytics.actualResponseTime = now()
      }
    } catch (e) {
      await this.onError(
        ctx,
        e,
        MAX_TRIES,
        'There was an error while generating the image'
      )
    }
  }

  onAlterImage = async (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> => {
    try {
      if (ctx.session.openAi.imageGen.isEnabled) {
        const photo =
          ctx.message?.photo ?? ctx.message?.reply_to_message?.photo
        const prompt = ctx.message?.caption ?? ctx.message?.text
        const fileId = photo?.pop()?.file_id // with pop() get full image quality
        if (!fileId) {
          await ctx.reply('Cannot retrieve the image file. Please try again.')
          ctx.transient.analytics.actualResponseTime = now()
          return
        }
        const file = await ctx.api.getFile(fileId)
        const filePath = `${config.openAi.dalle.telegramFileUrl}${config.telegramBotAuthToken}/${file.file_path}`
        const imgSize = ctx.session.openAi.imageGen.imgSize
        ctx.chatAction = 'upload_photo'
        const imgs = await alterGeneratedImg(prompt ?? '', filePath, ctx, imgSize)
        if (imgs) {
          imgs.map(async (img: any) => {
            if (img?.url) {
              await ctx
                .replyWithPhoto(img.url, { message_thread_id: ctx.message?.message_thread_id })
                .catch(async (e) => {
                  await this.onError(
                    ctx,
                    e,
                    MAX_TRIES,
                    'There was an error while generating the image'
                  )
                })
            }
          })
        }
        ctx.chatAction = null
      }
    } catch (e: any) {
      await this.onError(
        ctx,
        e,
        MAX_TRIES,
        'An error occurred while generating the AI edit'
      )
    }
  }

  private async promptGen (data: ChatPayload, msgId?: number): Promise< { price: number, chat: ChatConversation[] }> {
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
      const isTypingEnabled = config.openAi.chatGpt.isTypingEnabled
      if (isTypingEnabled) {
        ctx.chatAction = 'typing'
      }
      const completion = await streamChatCompletion(
        conversation,
        ctx,
        model,
        msgId,
        true // telegram messages has a character limit
      )
      if (isTypingEnabled) {
        ctx.chatAction = null
      }
      if (completion) {
        ctx.transient.analytics.sessionState = RequestState.Success
        ctx.transient.analytics.actualResponseTime = now()
        const price = getPromptPrice(completion, data)
        this.logger.info(
          `streamChatCompletion result = tokens: ${
            price.promptTokens + price.completionTokens
          } | ${model} | price: ${price.price}¢`
        )
        return {
          price: price.price,
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
      const { url, newPrompt } = hasUrl(ctx, prompt)
      if (url) {
        const chat: ChatConversation[] = []
        await this.onWebCrawler(
          ctx,
          await preparePrompt(ctx, newPrompt),
          chat,
          url,
          'sum'
        )
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

  private async onWebCrawler (
    ctx: OnMessageContext | OnCallBackQueryData,
    prompt: string,
    chat: ChatConversation[],
    url: string,
    command = 'ask',
    retryCount = MAX_TRIES
  ): Promise<undefined | {
      text: string
      bytes: number
      time: number
      fees: number
      oneFees: number
    }> {
    try {
      if (retryCount === 0) {
        ctx.transient.analytics.sessionState = RequestState.Error
        await sendMessage(
          ctx,
          'Url not supported, incorrect web site address or missing user credentials',
          { parseMode: 'Markdown' }
        ).catch(async (e) => {
          await this.onError(ctx, e)
        })
        ctx.transient.analytics.actualResponseTime = now()
        return
      }
      let price = 0
      ctx.session.openAi.chatGpt.model = ChatGPTModelsEnum.GPT_35_TURBO_16K
      const model = ChatGPTModelsEnum.GPT_35_TURBO_16K
      const chatModel = getChatModel(model)
      const webCrawlerMaxTokens =
        chatModel.maxContextTokens - config.openAi.chatGpt.maxTokens * 2
      const { user, password } = hasUsernamePassword(prompt)
      if (user && password) {
        const maskedPrompt = ctx.message
          ?.text?.replaceAll(user, '****')?.replaceAll(password, '*****') ?? ''
        if (ctx.chat?.id && ctx.message?.message_id) {
          await ctx.api.deleteMessage(ctx.chat?.id, ctx.message?.message_id)
        }
        ctx.transient.analytics.sessionState = RequestState.Success
        await sendMessage(ctx, maskedPrompt)
        ctx.transient.analytics.actualResponseTime = now()
      }
      const webCrawlerStatusMsgId = (
        await ctx.reply('...', {
          message_thread_id:
            ctx.message?.message_thread_id ??
            ctx.message?.reply_to_message?.message_thread_id
        })
      ).message_id
      ctx.transient.analytics.firstResponseTime = now()
      const webContent = await getWebContent(
        url,
        webCrawlerMaxTokens,
        user,
        password
      )
      if (webContent.urlText !== '') {
        const oneFee = await this.payments.getPriceInONE(webContent.fees)
        // console.log(+oneFee.toFixed() + 3500000000000000);
        const statusMsg = `${url} downloaded: ${(webContent.networkTraffic / 1048576).toFixed(2
          )}m size ${(webContent.elapsedTime / 1000).toFixed(2)}s time (${this.payments.toONE(oneFee, false).toFixed(2)} ONE fee)`
        await ctx.api.editMessageText(ctx.chat?.id ?? '', webCrawlerStatusMsgId, statusMsg, { parse_mode: 'Markdown' }).catch(async (e) => {
          await this.onError(ctx, e)
        })
        price = webContent.fees
        if (
          !(await this.payments.pay(ctx as OnMessageContext, webContent.fees))
        ) {
          await this.onNotBalanceMessage(ctx)
        } else {
          const msgId = (
            await ctx.reply('...', {
              message_thread_id:
                ctx.message?.message_thread_id ??
                ctx.message?.reply_to_message?.message_thread_id
            })
          ).message_id
          let newPrompt: string
          const webCrawlConversation: ChatConversation[] = []
          if (command !== 'sum') {
            webCrawlConversation.push({
              content: config.openAi.chatGpt.webCrawlerContext,
              role: 'system'
            })
          }
          webCrawlConversation.push({
            content: `Here is the text: ${webContent.urlText}`,
            role: 'user'
          })
          const webCrawlerResult = await chatCompletion(
            webCrawlConversation,
            model,
            true
          )
          price += webCrawlerResult.price

          if (prompt !== '') {
            newPrompt = `${
              command === 'sum' ? 'Summarize' : ''
            } ${prompt}. This is the web crawl text: ${
              webCrawlerResult.completion
            }`
          } else {
            newPrompt = `Summarize this text ${webCrawlerResult.completion}`
          }
          chat.push({
            content: newPrompt,
            role: 'user'
          })
          const payload = {
            conversation: chat,
            model: model || config.openAi.chatGpt.model,
            ctx
          }
          const result = await this.promptGen(payload, msgId)
          // chat = [...result.chat]
          price += result.price
          if (!(await this.payments.pay(ctx as OnMessageContext, price))) {
            await this.onNotBalanceMessage(ctx)
          }
        }
      } else {
        await this.onWebCrawler(ctx, prompt, chat, url, command, retryCount - 1)
        return
      }
      return {
        text: webContent.urlText,
        bytes: webContent.networkTraffic,
        time: webContent.elapsedTime,
        fees: await getCrawlerPrice(webContent.networkTraffic),
        oneFees: 0.5
      }
    } catch (e) {
      await this.onError(ctx, e)
    }
  }

  async onMention (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    try {
      if (this.botSuspended) {
        ctx.transient.analytics.sessionState = RequestState.Error
        await sendMessage(ctx, 'The bot is suspended').catch(async (e) => {
          await this.onError(ctx, e)
        })
        ctx.transient.analytics.actualResponseTime = now()
        return
      }
      const { username } = ctx.me
      const prompt = ctx.message?.text?.slice(username.length + 1) ?? '' // @
      ctx.session.openAi.chatGpt.requestQueue.push(
        await preparePrompt(ctx, prompt)
      )
      if (!ctx.session.openAi.chatGpt.isProcessingQueue) {
        ctx.session.openAi.chatGpt.isProcessingQueue = true
        await this.onChatRequestHandler(ctx).then(() => {
          ctx.session.openAi.chatGpt.isProcessingQueue = false
        })
      }
    } catch (e) {
      await this.onError(ctx, e)
    }
  }

  async onPrefix (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    try {
      if (this.botSuspended) {
        ctx.transient.analytics.sessionState = RequestState.Error
        sendMessage(ctx, 'The bot is suspended').catch(async (e) => {
          await this.onError(ctx, e)
        })
        ctx.transient.analytics.actualResponseTime = now()
        return
      }
      const { prompt } = getCommandNamePrompt(
        ctx,
        SupportedCommands
      )
      const prefix = hasPrefix(prompt)
      ctx.session.openAi.chatGpt.requestQueue.push(
        await preparePrompt(ctx, prompt.slice(prefix.length))
      )
      if (!ctx.session.openAi.chatGpt.isProcessingQueue) {
        ctx.session.openAi.chatGpt.isProcessingQueue = true
        await this.onChatRequestHandler(ctx).then(() => {
          ctx.session.openAi.chatGpt.isProcessingQueue = false
        })
      }
    } catch (e) {
      await this.onError(ctx, e)
    }
  }

  async onPrivateChat (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    try {
      if (this.botSuspended) {
        ctx.transient.analytics.sessionState = RequestState.Error
        sendMessage(ctx, 'The bot is suspended').catch(async (e) => { await this.onError(ctx, e) })
        ctx.transient.analytics.actualResponseTime = now()
        return
      }
      ctx.session.openAi.chatGpt.requestQueue.push(
        await preparePrompt(ctx, ctx.message?.text ?? '')
      )
      if (!ctx.session.openAi.chatGpt.isProcessingQueue) {
        ctx.session.openAi.chatGpt.isProcessingQueue = true
        await this.onChatRequestHandler(ctx).then(() => {
          ctx.session.openAi.chatGpt.isProcessingQueue = false
        })
      }
    } catch (e) {
      await this.onError(ctx, e)
    }
  }

  private async freePromptChatGroup (ctx: OnMessageContext | OnCallBackQueryData, prompt: string): Promise<boolean> {
    if (prompt === 'on' || prompt === 'On') {
      ctx.session.openAi.chatGpt.isFreePromptChatGroups = true
      await ctx.reply('Command free Open AI is enabled').catch(async (e) => { await this.onError(ctx, e) })
      return true
    }
    if (prompt === 'off' || prompt === 'Off') {
      ctx.session.openAi.chatGpt.isFreePromptChatGroups = false
      await ctx.reply('Command free Open AI is disabled').catch(async (e) => { await this.onError(ctx, e) })
      return true
    }
    return false
  }

  async onChat (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    try {
      if (this.botSuspended) {
        ctx.transient.analytics.sessionState = RequestState.Error
        await sendMessage(ctx, 'The bot is suspended').catch(async (e) => { await this.onError(ctx, e) })
        ctx.transient.analytics.actualResponseTime = now()
        return
      }
      const prompt = ctx.match ? ctx.match : ctx.message?.text
      if (await this.freePromptChatGroup(ctx, prompt as string)) {
        return
      }
      ctx.session.openAi.chatGpt.requestQueue.push(
        await preparePrompt(ctx, prompt as string)
      )
      if (!ctx.session.openAi.chatGpt.isProcessingQueue) {
        ctx.session.openAi.chatGpt.isProcessingQueue = true
        await this.onChatRequestHandler(ctx).then(() => {
          ctx.session.openAi.chatGpt.isProcessingQueue = false
        })
      }
    } catch (e: any) {
      await this.onError(ctx, e)
    }
  }

  async onChatRequestHandler (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    while (ctx.session.openAi.chatGpt.requestQueue.length > 0) {
      try {
        const prompt = ctx.session.openAi.chatGpt.requestQueue.shift() ?? ''
        const { chatConversation, model } = ctx.session.openAi.chatGpt
        if (await this.hasBalance(ctx)) {
          if (prompt === '') {
            const msg =
              chatConversation.length > 0
                ? `${appText.gptLast}\n_${
                    chatConversation[chatConversation.length - 1].content
                  }_`
                : appText.introText
            ctx.transient.analytics.sessionState = RequestState.Success
            await sendMessage(ctx, msg, { parseMode: 'Markdown' }).catch(async (e) => { await this.onError(ctx, e) })
            ctx.transient.analytics.actualResponseTime = now()
            return
          }
          const { url } = hasUrl(ctx, prompt)
          if (chatConversation.length === 0 && !url) {
            chatConversation.push({
              role: 'system',
              content: config.openAi.chatGpt.chatCompletionContext
            })
          }
          if (url) {
            await this.onWebCrawler(ctx, prompt, chatConversation, url, 'ask')
          } else {
            chatConversation.push({
              role: 'user',
              content: prompt
            })
            const payload = {
              conversation: chatConversation,
              model: model || config.openAi.chatGpt.model,
              ctx
            }
            const result = await this.promptGen(payload)
            ctx.session.openAi.chatGpt.chatConversation = [...result.chat]
            if (
              !(await this.payments.pay(ctx as OnMessageContext, result.price))
            ) {
              await this.onNotBalanceMessage(ctx)
            }
          }
          ctx.chatAction = null
        } else {
          await this.onNotBalanceMessage(ctx)
        }
      } catch (e: any) {
        await this.onError(ctx, e)
      }
    }
  }

  async onLast (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    if (ctx.session.openAi.chatGpt.chatConversation.length > 0) {
      const chat = ctx.session.openAi.chatGpt.chatConversation
      ctx.transient.analytics.sessionState = RequestState.Success
      await sendMessage(
        ctx,
        `${appText.gptLast}\n_${chat[chat.length - 1].content}_`,
        { parseMode: 'Markdown' }
      ).catch(async (e) => { await this.onError(ctx, e) })
      ctx.transient.analytics.actualResponseTime = now()
    } else {
      ctx.transient.analytics.sessionState = RequestState.Error
      await sendMessage(ctx, 'To start a conversation please write */ask*', { parseMode: 'Markdown' })
        .catch(async (e) => { await this.onError(ctx, e) })
      ctx.transient.analytics.actualResponseTime = now()
    }
  }

  async onEnd (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    ctx.session.openAi.chatGpt.chatConversation = []
    ctx.session.openAi.chatGpt.usage = 0
    ctx.session.openAi.chatGpt.price = 0
  }

  async onNotBalanceMessage (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    const accountId = this.payments.getAccountId(ctx)
    const account = this.payments.getUserAccount(accountId)
    const addressBalance = await this.payments.getUserBalance(accountId)
    const { totalCreditsAmount } = await chatService.getUserCredits(accountId)
    const balance = addressBalance.plus(totalCreditsAmount)
    const balanceOne = this.payments.toONE(balance, false).toFixed(2)

    const buyCreditsButton = new InlineKeyboard().text(
      'Buy now',
      Callbacks.CreditsFiatBuy
    )

    const balanceMessage = appText.notEnoughBalance
      .replaceAll('$CREDITS', balanceOne)
      .replaceAll('$WALLET_ADDRESS', account?.address ?? '')
    ctx.transient.analytics.sessionState = RequestState.Error
    await sendMessage(ctx, balanceMessage, {
      parseMode: 'Markdown',
      reply_markup: buyCreditsButton
    }).catch(async (e) => { await this.onError(ctx, e) })
    ctx.transient.analytics.actualResponseTime = now()
  }

  async onError (
    ctx: OnMessageContext | OnCallBackQueryData,
    ex: any,
    retryCount: number = MAX_TRIES,
    msg?: string
  ): Promise<void> {
    ctx.transient.analytics.sessionState = RequestState.Error
    Sentry.setContext('open-ai', { retryCount, msg })
    Sentry.captureException(ex)
    if (retryCount === 0) {
      // Retry limit reached, log an error or take alternative action
      this.logger.error(`Retry limit reached for error: ${ex}`)
      return
    }
    if (ex instanceof GrammyError) {
      if (ex.error_code === 400 && ex.description.includes('not enough rights')) {
        await sendMessage(
          ctx,
          'Error: The bot does not have permission to send photos in chat'
        )
        ctx.transient.analytics.actualResponseTime = now()
      } else if (ex.error_code === 429) {
        this.botSuspended = true
        const retryAfter = ex.parameters.retry_after
          ? ex.parameters.retry_after < 60
            ? 60
            : ex.parameters.retry_after * 2
          : 60
        const method = ex.method
        const errorMessage = `On method "${method}" | ${ex.error_code} - ${ex.description}`
        this.logger.error(errorMessage)
        await sendMessage(
          ctx,
          `${
            ctx.from.username ? ctx.from.username : ''
          } Bot has reached limit, wait ${retryAfter} seconds`
        ).catch(async (e) => { await this.onError(ctx, e, retryCount - 1) })
        ctx.transient.analytics.actualResponseTime = now()
        if (method === 'editMessageText') {
          ctx.session.openAi.chatGpt.chatConversation.pop() // deletes last prompt
        }
        await sleep(retryAfter * 1000) // wait retryAfter seconds to enable bot
        this.botSuspended = false
      } else {
        this.logger.error(
          `On method "${ex.method}" | ${ex.error_code} - ${ex.description}`
        )
      }
    } else if (ex instanceof OpenAI.APIError) {
      // 429 RateLimitError
      // e.status = 400 || e.code = BadRequestError
      this.logger.error(`OPENAI Error ${ex.status}(${ex.code}) - ${ex.message}`)
      if (ex.code === 'context_length_exceeded') {
        await sendMessage(ctx, ex.message).catch(async (e) => { await this.onError(ctx, e, retryCount - 1) })
        ctx.transient.analytics.actualResponseTime = now()
        await this.onEnd(ctx)
      } else {
        await sendMessage(
          ctx,
          'Error accessing OpenAI (ChatGPT). Please try later'
        ).catch(async (e) => { await this.onError(ctx, e, retryCount - 1) })
        ctx.transient.analytics.actualResponseTime = now()
      }
    } else {
      this.logger.error(`${ex.toString()}`)
      await sendMessage(ctx, 'Error handling your request')
        .catch(async (e) => { await this.onError(ctx, e, retryCount - 1) }
        )
      ctx.transient.analytics.actualResponseTime = now()
    }
  }
}

// onGenImgEnCmd = async (ctx: OnMessageContext | OnCallBackQueryData) => {
//   try {
//     if (ctx.session.openAi.imageGen.isEnabled) {
//       const prompt = await ctx.match;
//       if (!prompt) {
//         sendMessage(ctx, "Error: Missing prompt", {
//           topicId: ctx.message?.message_thread_id,
//         }).catch((e) =>
//           this.onError(ctx, e, MAX_TRIES, "Error: Missing prompt")
//         );
//         return;
//       }
//       const payload = {
//         chatId: await ctx.chat?.id!,
//         prompt: prompt as string,
//         numImages: await ctx.session.openAi.imageGen.numImages,
//         imgSize: await ctx.session.openAi.imageGen.imgSize,
//       };
//       sendMessage(ctx, "generating improved prompt...", {
//         topicId: ctx.message?.message_thread_id,
//       }).catch((e) =>
//         this.onError(ctx, e, MAX_TRIES, "generating improved prompt...")
//       );
//       await imgGenEnhanced(payload, ctx);
//     } else {
//       sendMessage(ctx, "Bot disabled", {
//         topicId: ctx.message?.message_thread_id,
//       }).catch((e) => this.onError(ctx, e, MAX_TRIES, "Bot disabled"));
//     }
//   } catch (e) {
//     this.onError(ctx, e);
//   }
// };

// private async imgGenEnhanced(
//   data: ImageGenPayload,
//   ctx: OnMessageContext | OnCallBackQueryData
// ) {
//   const { chatId, prompt, numImages, imgSize, model } = data;
//   try {
//     const upgratedPrompt = await improvePrompt(prompt, model!);
//     if (upgratedPrompt) {
//       await ctx
//         .reply(
//           `The following description was added to your prompt: ${upgratedPrompt}`
//         )
//         .catch((e) => {
//           throw e;
//         });
//     }
//     // bot.api.sendMessage(chatId, "generating the output...");
//     const imgs = await postGenerateImg(
//       upgratedPrompt || prompt,
//       numImages,
//       imgSize
//     );
//     imgs.map(async (img: any) => {
//       await ctx
//         .replyWithPhoto(img.url, {
//           caption: `/DALLE ${upgratedPrompt || prompt}`,
//         })
//         .catch((e) => {
//           throw e;
//         });
//     });
//     return true;
//   } catch (e) {
//     throw e;
//   }
// };
