import { GrammyError, InlineKeyboard } from 'grammy'
import OpenAI from 'openai'
import { type Logger, pino } from 'pino'

import { type BotPayments } from '../payment'
import {
  type ChatConversation,
  type ChatPayload,
  type OnCallBackQueryData,
  type OnMessageContext,
  type PayableBot,
  RequestState
  // type ImageGenerated
} from '../types'
import {
  alterGeneratedImg,
  chatCompletion,
  getChatModel,
  getDalleModel,
  getDalleModelPrice,
  postGenerateImg,
  streamChatCompletion,
  streamChatVisionCompletion
} from './api/openAi'
import { appText } from './utils/text'
import { chatService } from '../../database/services'
import { ChatGPTModelsEnum } from './types'
import config from '../../config'
import { sleep } from '../sd-images/utils'
import {
  getMessageExtras,
  getPromptPrice,
  getUrlFromText,
  hasChatPrefix,
  hasDallePrefix,
  hasNewPrefix,
  hasPrefix,
  hasUrl,
  hasCodeSnippet,
  isMentioned,
  MAX_TRIES,
  preparePrompt,
  sendMessage,
  SupportedCommands,
  getMinBalance
} from './helpers'
import * as Sentry from '@sentry/node'
import { now } from '../../utils/perf'
import { AxiosError } from 'axios'
import { Callbacks } from '../types'
import { LlmsBot } from '../llms'
import { type PhotoSize } from 'grammy/types'
import { responseWithVoice } from '../voice-to-voice-gpt/helpers'
import { promptHasBadWords } from '../sd-images/helpers'

const priceAdjustment = config.openAi.chatGpt.priceAdjustment
export class OpenAIBot implements PayableBot {
  public readonly module = 'OpenAIBot'
  private readonly logger: Logger
  private readonly payments: BotPayments
  private readonly llmsBot: LlmsBot
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
    this.llmsBot = new LlmsBot(payments)
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
    const photo = ctx.message?.reply_to_message?.photo
    if (photo) {
      const imgId = (photo?.[0].file_unique_id) ?? ''
      if (ctx.session.openAi.imageGen.imgInquiried.find(i => i === imgId)) {
        return false
      }
    }
    const hasReply = this.isSupportedImageReply(ctx)
    const chatPrefix = hasPrefix(ctx.message?.text ?? '')
    if (chatPrefix !== '') {
      return true
    }

    const hasCallbackQuery = this.isSupportedCallbackQuery(ctx)

    return hasCommand || !!hasReply || this.llmsBot.isSupportedEvent(ctx) || hasCallbackQuery
  }

  public getEstimatedPrice (ctx: any): number {
    try {
      const prompts = ctx.match
      if (this.isSupportedImageReply(ctx) && !isNaN(+prompts)) {
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
        ctx.hasCommand([SupportedCommands.dalle,
          SupportedCommands.dalleImg,
          SupportedCommands.dalleShort,
          SupportedCommands.dalleShorter])
      ) {
        const imageNumber = ctx.session.openAi.imageGen.numImages
        const imageSize = ctx.session.openAi.imageGen.imgSize
        const model = getDalleModel(imageSize)
        const price = getDalleModelPrice(model, true, imageNumber) // cents
        return price * priceAdjustment
      }
      if (ctx.hasCommand(SupportedCommands.genImgEn)) {
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
      if (this.llmsBot.isSupportedEvent(ctx)) {
        return 0
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
      if (prompt && !isNaN(+prompt)) { // && !isNaN(+prompt)
        return true
      } else if (prompt && (ctx.chat?.type === 'private' || ctx.hasCommand(SupportedCommands.vision))) {
        return true
      }
    }
    return false
  }

  async shareImg (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    const threadId = ctx.message?.message_thread_id ? ctx.message?.message_thread_id : ctx.message?.reply_to_message?.message_thread_id
    if (ctx.callbackQuery?.data) {
      const imgId = +ctx.callbackQuery?.data?.split('|')[1]
      const img = ctx.session.openAi.imageGen.imageGenerated[imgId]
      const msgId = (
        await ctx.reply('Inscribing the image...', { message_thread_id: threadId })
      ).message_id
      const result = await this.payments.inscribeImg(ctx, img, msgId)
      if (result) {
        await ctx.editMessageReplyMarkup({})
      }
    }
  }

  public isSupportedCallbackQuery (
    ctx: OnMessageContext | OnCallBackQueryData
  ): boolean {
    if (!ctx.callbackQuery?.data) {
      return false
    }
    return ctx.callbackQuery?.data.startsWith('share-payload')
  }

  public async onEvent (
    ctx: OnMessageContext | OnCallBackQueryData,
    refundCallback: (reason?: string) => void
  ): Promise<void> {
    ctx.transient.analytics.module = this.module
    if (!(this.isSupportedEvent(ctx)) && (ctx.chat?.type !== 'private') && !ctx.session.openAi.chatGpt.isFreePromptChatGroups) {
      ctx.transient.analytics.sessionState = RequestState.Error
      this.logger.warn(`### unsupported command ${ctx.message?.text}`)
      return
    }
    ctx.transient.analytics.sessionState = RequestState.Success
    if (this.isSupportedCallbackQuery(ctx)) {
      await this.shareImg(ctx)
      return
    }

    if (this.isSupportedImageReply(ctx)) {
      const photo = ctx.message?.photo ?? ctx.message?.reply_to_message?.photo
      const prompt = ctx.message?.caption ?? ctx.message?.text ?? ''
      const imgId = (photo?.[0].file_unique_id) ?? ''
      if (!ctx.session.openAi.imageGen.imgInquiried.find(i => i === imgId)) {
        ctx.session.openAi.imageGen.imgRequestQueue.push({
          prompt,
          photo,
          command: !isNaN(+prompt) ? 'alter' : 'vision'
        })
        if (!ctx.session.openAi.imageGen.isProcessingQueue) {
          ctx.session.openAi.imageGen.isProcessingQueue = true
          await this.onImgRequestHandler(ctx).then(() => {
            ctx.session.openAi.imageGen.isProcessingQueue = false
          })
        }
      } else {
        refundCallback('This image was already inquired')
      }
      return
    }

    if (
      ctx.hasCommand(SupportedCommands.chat) ||
      (ctx.message?.text?.startsWith('chat ') && ctx.chat?.type === 'private')
    ) {
      ctx.session.openAi.chatGpt.model = ChatGPTModelsEnum.GPT_4
      await this.onChat(ctx)
      return
    }

    if (
      ctx.hasCommand(SupportedCommands.new) ||
      (ctx.message?.text?.startsWith('new ') && ctx.chat?.type === 'private')
    ) {
      await this.onStop(ctx)
      await this.onChat(ctx)
      return
    }

    if (
      ctx.hasCommand(SupportedCommands.ask) ||
      (ctx.message?.text?.startsWith('ask ') && ctx.chat?.type === 'private')
    ) {
      ctx.session.openAi.chatGpt.model = ChatGPTModelsEnum.GPT_4
      await this.onChat(ctx)
      return
    }

    if (ctx.hasCommand(SupportedCommands.ask35)) {
      ctx.session.openAi.chatGpt.model = ChatGPTModelsEnum.GPT_35_TURBO_16K
      await this.onChat(ctx)
      return
    }

    if (ctx.hasCommand(SupportedCommands.gpt4)) {
      ctx.session.openAi.chatGpt.model = ChatGPTModelsEnum.GPT_4
      await this.onChat(ctx)
      return
    }

    if (ctx.hasCommand(SupportedCommands.gpt)) {
      ctx.session.openAi.chatGpt.model = ChatGPTModelsEnum.GPT_4
      await this.onChat(ctx)
      return
    }

    if (ctx.hasCommand(SupportedCommands.ask32)) {
      ctx.session.openAi.chatGpt.model = ChatGPTModelsEnum.GPT_4_32K
      await this.onChat(ctx)
      return
    }

    if (ctx.hasCommand(SupportedCommands.vision)) {
      const photoUrl = getUrlFromText(ctx)
      if (photoUrl) {
        const prompt = ctx.match
        ctx.session.openAi.imageGen.imgRequestQueue.push({
          prompt,
          photoUrl,
          command: !isNaN(+prompt) ? 'alter' : 'vision'
        })
        if (!ctx.session.openAi.imageGen.isProcessingQueue) {
          ctx.session.openAi.imageGen.isProcessingQueue = true
          await this.onImgRequestHandler(ctx).then(() => {
            ctx.session.openAi.imageGen.isProcessingQueue = false
          })
        }
      }
    }

    if (
      ctx.hasCommand([SupportedCommands.dalle,
        SupportedCommands.dalleImg,
        SupportedCommands.dalleShort,
        SupportedCommands.dalleShorter]) ||
      (ctx.message?.text?.startsWith('image ') && ctx.chat?.type === 'private')
    ) {
      let prompt = (ctx.match ? ctx.match : ctx.message?.text) as string
      if (!prompt || prompt.split(' ').length === 1) {
        prompt = config.openAi.dalle.defaultPrompt
      }
      if (promptHasBadWords(prompt)) {
        console.log(`### promptHasBadWords ${ctx.message?.text}`)
        await sendMessage(
          ctx,
          'Your prompt has been flagged for potentially generating illegal or malicious content. If you believe there has been a mistake, please reach out to support.'
        )
        ctx.transient.analytics.sessionState = RequestState.Error
        ctx.transient.analytics.actualResponseTime = now()
        refundCallback('Prompt has bad words')
        return
      }
      ctx.session.openAi.imageGen.imgRequestQueue.push({
        command: 'dalle',
        prompt
      })
      if (!ctx.session.openAi.imageGen.isProcessingQueue) {
        ctx.session.openAi.imageGen.isProcessingQueue = true
        await this.onImgRequestHandler(ctx).then(() => {
          ctx.session.openAi.imageGen.isProcessingQueue = false
        })
      }
      return
    }

    if (this.llmsBot.isSupportedEvent(ctx)) {
      await this.llmsBot.onEvent(ctx)
      return
    }

    if (ctx.hasCommand(SupportedCommands.last)) {
      await this.onLast(ctx)
      return
    }

    const text = ctx.message?.text ?? ''
    const newPrefix = hasNewPrefix(text)
    if (newPrefix !== '') {
      await this.onEnd(ctx)
      await this.onPrefix(ctx, newPrefix)
      return
    }

    if (hasDallePrefix(text) !== '') {
      const prefix = hasDallePrefix(text)
      let prompt = (ctx.match ? ctx.match : ctx.message?.text) as string
      if (!prompt || prompt.split(' ').length === 1) {
        prompt = config.openAi.dalle.defaultPrompt
      }
      if (promptHasBadWords(prompt)) {
        console.log(`### promptHasBadWords ${ctx.message?.text}`)
        await sendMessage(
          ctx,
          'Your prompt has been flagged for potentially generating illegal or malicious content. If you believe there has been a mistake, please reach out to support.'
        )
        ctx.transient.analytics.sessionState = RequestState.Error
        ctx.transient.analytics.actualResponseTime = now()
        refundCallback('Prompt has bad words')
        return
      }
      ctx.session.openAi.imageGen.imgRequestQueue.push({
        command: 'dalle',
        prompt: prompt.slice(prefix.length)
      })
      if (!ctx.session.openAi.imageGen.isProcessingQueue) {
        ctx.session.openAi.imageGen.isProcessingQueue = true
        await this.onImgRequestHandler(ctx).then(() => {
          ctx.session.openAi.imageGen.isProcessingQueue = false
        })
      }
      return
    }
    const prefix = hasChatPrefix(text)
    if (prefix !== '') {
      await this.onPrefix(ctx, prefix)
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

  private async hasBalance (ctx: OnMessageContext | OnCallBackQueryData,
    minBalance = +config.openAi.chatGpt.minimumBalance): Promise<boolean> {
    const minBalanceOne = this.payments.toONE(await this.payments.getPriceInONE(minBalance), false)
    const accountId = this.payments.getAccountId(ctx)
    const addressBalance = await this.payments.getUserBalance(accountId)
    const { totalCreditsAmount } = await chatService.getUserCredits(accountId)
    const balance = addressBalance.plus(totalCreditsAmount)
    const balanceOne = this.payments.toONE(balance, false)
    const isGroupInWhiteList = await this.payments.isGroupInWhitelist(ctx as OnMessageContext)
    return (
      +balanceOne > +minBalanceOne ||
      (this.payments.isUserInWhitelist(ctx.from.id, ctx.from.username)) ||
      isGroupInWhiteList
    )
  }

  public async voiceCommand (ctx: OnMessageContext | OnCallBackQueryData, command: string, transcribedText: string): Promise<void> {
    try {
      let prompt = transcribedText.slice(command.length).replace(/^[.,\s]+/, '')
      switch (command) {
        case SupportedCommands.vision: {
          const photo = ctx.message?.photo ?? ctx.message?.reply_to_message?.photo
          if (photo) {
            ctx.session.openAi.imageGen.imgRequestQueue.push({
              prompt,
              photo,
              command
            })
            if (!ctx.session.openAi.imageGen.isProcessingQueue) {
              ctx.session.openAi.imageGen.isProcessingQueue = true
              await this.onImgRequestHandler(ctx).then(() => {
                ctx.session.openAi.imageGen.isProcessingQueue = false
              })
            }
          }
          break
        }
        case SupportedCommands.ask:
        case SupportedCommands.talk: {
          if (this.botSuspended) {
            ctx.transient.analytics.sessionState = RequestState.Error
            await sendMessage(ctx, 'The bot is suspended').catch(async (e) => { await this.onError(ctx, e) })
            ctx.transient.analytics.actualResponseTime = now()
            return
          }
          const adaptedPrompt = (SupportedCommands.talk === command
            ? 'Keep it short, like a phone call'
            : '') + await preparePrompt(ctx, prompt)
          ctx.session.openAi.chatGpt.requestQueue.push({
            prompt: adaptedPrompt,
            outputFormat: SupportedCommands.ask === command ? 'text' : 'voice'
          })
          if (!ctx.session.openAi.chatGpt.isProcessingQueue) {
            ctx.session.openAi.chatGpt.isProcessingQueue = true
            await this.onChatRequestHandler(ctx).then(() => {
              ctx.session.openAi.chatGpt.isProcessingQueue = false
            })
          }
          break
        }
        case SupportedCommands.dalleImg: {
          if (!prompt || prompt.split(' ').length === 1) {
            prompt = config.openAi.dalle.defaultPrompt
          }
          ctx.session.openAi.imageGen.imgRequestQueue.push({
            command: 'dalle',
            prompt
          })
          if (!ctx.session.openAi.imageGen.isProcessingQueue) {
            ctx.session.openAi.imageGen.isProcessingQueue = true
            await this.onImgRequestHandler(ctx).then(() => {
              ctx.session.openAi.imageGen.isProcessingQueue = false
            })
          }
          break
        }
      }
    } catch (e: any) {
      await this.onError(ctx, e)
    }
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
            `streamChatCompletion result = tokens: ${price.promptTokens + price.completionTokens} | ${model} | price: ${price.price}¢` // price.promptTokens + price.completionTokens  }
          )
          conversation.push({
            role: 'assistant',
            content: completion.completion?.content ?? ''
          })
          return {
            price: price.price,
            chat: conversation
          }
        }
      } else {
        const response = await chatCompletion(conversation, ChatGPTModelsEnum.GPT_35_TURBO_16K)
        conversation.push({
          role: 'assistant',
          content: response.completion
        })
        await responseWithVoice(response.completion, ctx as OnMessageContext, msgId)
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
      ctx.session.openAi.chatGpt.requestQueue.push({
        prompt: await preparePrompt(ctx, prompt),
        outputFormat: 'text'
      })
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

  async onPrefix (ctx: OnMessageContext | OnCallBackQueryData, prefix: string): Promise<void> {
    try {
      if (this.botSuspended) {
        ctx.transient.analytics.sessionState = RequestState.Error
        sendMessage(ctx, 'The bot is suspended').catch(async (e) => {
          await this.onError(ctx, e)
        })
        ctx.transient.analytics.actualResponseTime = now()
        return
      }
      const prompt = ctx.message?.text?.slice(prefix.length) ?? ''
      ctx.session.openAi.chatGpt.requestQueue.push({
        prompt: await preparePrompt(ctx, prompt),
        outputFormat: 'text'
      })
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
      ctx.session.openAi.chatGpt.requestQueue.push({
        prompt: await preparePrompt(ctx, ctx.message?.text ?? ''),
        outputFormat: 'text'
      })
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
      await ctx.reply('Prefixes and commands are now disabled for /ask.').catch(async (e) => { await this.onError(ctx, e) })
      return true
    }
    if (prompt === 'off' || prompt === 'Off') {
      ctx.session.openAi.chatGpt.isFreePromptChatGroups = false
      await ctx.reply('Prefixes and commands are now disabled for /ask.', {}).catch(async (e) => { await this.onError(ctx, e) })
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
      ctx.session.openAi.chatGpt.requestQueue.push({
        prompt: await preparePrompt(ctx, prompt as string),
        outputFormat: 'text'
      })
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
        const minBalance = await getMinBalance(ctx, ctx.session.openAi.chatGpt.model)
        if (await this.hasBalance(ctx, minBalance)) {
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
          const { url, newPrompt } = hasUrl(ctx, prompt.prompt)
          const hasCode = hasCodeSnippet(ctx)
          if (chatConversation.length === 0 && (hasCode || !url)) {
            chatConversation.push({
              role: 'system',
              content: config.openAi.chatGpt.chatCompletionContext
            })
          }
          if (!hasCode && url && ctx.chat?.id) {
            await this.llmsBot.urlHandler(ctx, url, newPrompt)
          } else {
            chatConversation.push({
              role: 'user',
              content: prompt.prompt
            })
            const payload = {
              conversation: chatConversation,
              model: model || config.openAi.chatGpt.model,
              ctx
            }
            const result = await this.completionGen(payload, prompt.msgId, prompt.outputFormat)
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

  async onImgRequestHandler (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    while (ctx.session.openAi.imageGen.imgRequestQueue.length > 0) {
      try {
        const img = ctx.session.openAi.imageGen.imgRequestQueue.shift()
        const minBalance = await getMinBalance(ctx, ctx.session.openAi.chatGpt.model)
        if (await this.hasBalance(ctx, minBalance)) {
          if (img?.command === 'dalle') {
            await this.onGenImgCmd(img?.prompt, ctx)
          } else if (img?.command === 'alter') {
            await this.onAlterImage(img?.photo, img?.prompt, ctx)
            if (img?.photo?.[0].file_unique_id) {
              ctx.session.openAi.imageGen.imgInquiried.push(img?.photo?.[0].file_unique_id)
            }
          } else {
            await this.onInquiryImage(img?.photo, img?.photoUrl, img?.prompt, ctx)
            if (img?.photo?.[0].file_unique_id) {
              ctx.session.openAi.imageGen.imgInquiried.push(img?.photo?.[0].file_unique_id)
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

  onGenImgCmd = async (prompt: string | undefined, ctx: OnMessageContext | OnCallBackQueryData): Promise<void> => {
    try {
      if (ctx.session.openAi.imageGen.isEnabled && ctx.chat?.id) {
        ctx.chatAction = 'upload_photo'
        // eslint-disable-next-line @typescript-eslint/naming-convention
        const { message_id } = await ctx.reply(
          'Generating image via OpenAI\'s DALL·E 3...', { message_thread_id: ctx.message?.message_thread_id }
        )
        const numImages = ctx.session.openAi.imageGen.numImages
        const imgSize = ctx.session.openAi.imageGen.imgSize
        const imgs = await postGenerateImg(prompt ?? '', numImages, imgSize)
        if (imgs.length > 0) {
          await Promise.all(imgs.map(async (img: any) => {
            if (ctx.session.openAi.imageGen.isInscriptionLotteryEnabled) {
              const inlineKeyboard = new InlineKeyboard().text('Share to enter lottery', `share-payload|${ctx.session.openAi.imageGen.imageGenerated.length}`) // ${imgs[0].url}
              const msgExtras = getMessageExtras({
                caption: `/dalle ${prompt}\n\n Check [q.country](https://q.country) for general lottery information`,
                reply_markup: inlineKeyboard,
                link_preview_options: { is_disabled: true },
                parseMode: 'Markdown'
              })
              const msg = await ctx.replyWithPhoto(img.url, msgExtras)
              const genImg = msg.photo
              const fileId = genImg?.pop()?.file_id
              ctx.session.openAi.imageGen.imageGenerated.push({ prompt, photoUrl: img.url, photoId: fileId })
            } else {
              const msgExtras = getMessageExtras({ caption: `/dalle ${prompt}` })
              await ctx.replyWithPhoto(img.url, msgExtras)
            }
          }))
          await ctx.api.deleteMessage(ctx.chat?.id, message_id)
          ctx.transient.analytics.sessionState = RequestState.Success
          ctx.transient.analytics.actualResponseTime = now()
        } else {
          ctx.transient.analytics.sessionState = RequestState.Error
          await sendMessage(ctx, 'Bot disabled').catch(async (e) => {
            await this.onError(ctx, e, MAX_TRIES, 'Bot disabled')
          })
          ctx.transient.analytics.actualResponseTime = now()
        }
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

  onInquiryImage = async (photo: PhotoSize[] | undefined, photoUrl: string[] | undefined, prompt: string | undefined, ctx: OnMessageContext | OnCallBackQueryData): Promise<void> => {
    try {
      if (ctx.session.openAi.imageGen.isEnabled) {
        // let filePath = ''
        let imgList = []
        if (photo) {
          const fileId = photo?.pop()?.file_id // with pop() get full image quality
          if (!fileId) {
            await ctx.reply('Cannot retrieve the image file. Please try again.')
            ctx.transient.analytics.actualResponseTime = now()
            return
          }
          const file = await ctx.api.getFile(fileId)
          imgList.push(`${config.openAi.dalle.telegramFileUrl}${config.telegramBotAuthToken}/${file.file_path}`)
        } else {
          imgList = photoUrl ?? []
        }
        const msgId = (
          await ctx.reply('...', {
            message_thread_id:
              ctx.message?.message_thread_id ??
              ctx.message?.reply_to_message?.message_thread_id
          })
        ).message_id
        const model = ChatGPTModelsEnum.GPT_4_VISION_PREVIEW
        const completion = await streamChatVisionCompletion(ctx, model, prompt ?? '', imgList, msgId, true)
        if (completion) {
          ctx.transient.analytics.sessionState = RequestState.Success
          ctx.transient.analytics.actualResponseTime = now()
          const price = getPromptPrice(completion, {
            conversation: [],
            prompt,
            model,
            ctx
          })
          this.logger.info(
            `streamChatVisionCompletion result = tokens: ${
                price.promptTokens + price.completionTokens
            } | ${model} | price: ${price.price}¢`
          )
          if (
            !(await this.payments.pay(ctx as OnMessageContext, price.price))
          ) {
            await this.onNotBalanceMessage(ctx)
          }
        }
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

  onAlterImage = async (photo: PhotoSize[] | undefined, prompt: string | undefined, ctx: OnMessageContext | OnCallBackQueryData): Promise<void> => {
    try {
      if (ctx.session.openAi.imageGen.isEnabled) {
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
          for (let i = 0; i < imgs.length; i++) {
            const img = imgs[i]
            if (img.url) {
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
          }
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          // imgs.map(async (img: any) => {
          //   if (img?.url) {
          //     await ctx
          //       .replyWithPhoto(img.url, { message_thread_id: ctx.message?.message_thread_id })
          //       .catch(async (e) => {
          //         await this.onError(
          //           ctx,
          //           e,
          //           MAX_TRIES,
          //           'There was an error while generating the image'
          //         )
          //       })
          //   }
          // })
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
    ctx.session.openAi.chatGpt.model = ChatGPTModelsEnum.GPT_4
    ctx.session.openAi.chatGpt.chatConversation = []
    ctx.session.openAi.chatGpt.usage = 0
    ctx.session.openAi.chatGpt.price = 0
  }

  async onStop (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    await this.onEnd(ctx)
    await this.llmsBot.onStop(ctx)
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
    ctx.chatAction = null
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
        await sendMessage(ctx, 'Error handling your request').catch(async (e) => {
          await this.onError(ctx, e, retryCount - 1)
        })
      }
    } else if (ex instanceof OpenAI.APIError) {
      // 429 RateLimitError
      // e.status = 400 || e.code = BadRequestError
      this.logger.error(`OPENAI Error ${ex.status}(${ex.code}) - ${ex.message}`)
      if (ex.code === 'content_policy_violation') {
        await sendMessage(ctx, ex.message).catch(async (e) => { await this.onError(ctx, e, retryCount - 1) })
        ctx.transient.analytics.actualResponseTime = now()
      } else if (ex.code === 'context_length_exceeded') {
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
    } else if (ex instanceof AxiosError) {
      await sendMessage(ctx, 'Error handling your request').catch(async (e) => {
        await this.onError(ctx, e, retryCount - 1)
      })
    } else {
      this.logger.error(`${ex.toString()}`)
      await sendMessage(ctx, 'Error handling your request')
        .catch(async (e) => { await this.onError(ctx, e, retryCount - 1) }
        )
      ctx.transient.analytics.actualResponseTime = now()
    }
  }
}
