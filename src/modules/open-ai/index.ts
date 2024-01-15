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
  hasDallePrefix,
  hasNewPrefix,
  hasPrefix,
  hasUrl,
  isMentioned,
  MAX_TRIES,
  preparePrompt,
  sendMessage,
  SupportedCommands
} from './helpers'
import * as Sentry from '@sentry/node'
import { now } from '../../utils/perf'
import { AxiosError } from 'axios'
import { Callbacks } from '../types'
import { LlmsBot } from '../llms'
import { type PhotoSize } from 'grammy/types'

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
    return hasCommand || !!hasReply || this.llmsBot.isSupportedEvent(ctx)
  }

  public getEstimatedPrice (ctx: any): number {
    try {
      const priceAdjustment = config.openAi.chatGpt.priceAdjustment
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
        ctx.hasCommand([SupportedCommands.dalle.name,
          SupportedCommands.dalleImg.name,
          SupportedCommands.dalleShort.name,
          SupportedCommands.dalleShorter.name])
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
      if (prompt) { // && !isNaN(+prompt)
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

    if (this.isSupportedImageReply(ctx)) {
      const photo = ctx.message?.photo ?? ctx.message?.reply_to_message?.photo
      const prompt = ctx.message?.caption ?? ctx.message?.text ?? ''
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
      return
    }

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
      ctx.hasCommand([SupportedCommands.dalle.name,
        SupportedCommands.dalleImg.name,
        SupportedCommands.dalleShort.name,
        SupportedCommands.dalleShorter.name]) ||
      (ctx.message?.text?.startsWith('image ') && ctx.chat?.type === 'private')
    ) {
      let prompt = (ctx.match ? ctx.match : ctx.message?.text) as string
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
      return
    }

    if (this.llmsBot.isSupportedEvent(ctx)) {
      await this.llmsBot.onEvent(ctx)
      return
    }

    if (ctx.hasCommand(SupportedCommands.last.name)) {
      await this.onLast(ctx)
      return
    }

    const text = ctx.message?.text ?? ''

    if (hasNewPrefix(text) !== '') {
      await this.onEnd(ctx)
      await this.onPrefix(ctx)
      return
    }

    if (hasDallePrefix(text) !== '') {
      const prefix = hasDallePrefix(text)
      let prompt = (ctx.match ? ctx.match : ctx.message?.text) as string
      if (!prompt || prompt.split(' ').length === 1) {
        prompt = config.openAi.dalle.defaultPrompt
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

    if (hasChatPrefix(text) !== '') {
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
          const { url, newPrompt } = hasUrl(ctx, prompt)
          if (chatConversation.length === 0 && !url) {
            chatConversation.push({
              role: 'system',
              content: config.openAi.chatGpt.chatCompletionContext
            })
          }
          if (url && ctx.chat?.id) {
            await this.llmsBot.urlHandler(ctx, url, newPrompt)
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

  async onImgRequestHandler (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    while (ctx.session.openAi.imageGen.imgRequestQueue.length > 0) {
      try {
        const img = ctx.session.openAi.imageGen.imgRequestQueue.shift()
        if (await this.hasBalance(ctx)) {
          if (img?.command === 'dalle') {
            await this.onGenImgCmd(img?.prompt, ctx)
          } else if (img?.command === 'alter') {
            await this.onAlterImage(img?.photo, img?.prompt, ctx)
          } else {
            await this.onInquiryImage(img?.photo, img?.prompt, ctx)
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
          'Generating dalle image...', { message_thread_id: ctx.message?.message_thread_id }
        )
        const numImages = ctx.session.openAi.imageGen.numImages
        const imgSize = ctx.session.openAi.imageGen.imgSize
        const imgs = await postGenerateImg(prompt ?? '', numImages, imgSize)
        const msgExtras = getMessageExtras({ caption: `/dalle ${prompt}` })
        await Promise.all(imgs.map(async (img: any) => {
          await ctx.replyWithPhoto(img.url, msgExtras).catch(async (e) => {
            await this.onError(ctx, e, MAX_TRIES)
          })
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
    } catch (e) {
      await this.onError(
        ctx,
        e,
        MAX_TRIES,
        'There was an error while generating the image'
      )
    }
  }

  onInquiryImage = async (photo: PhotoSize[] | undefined, prompt: string | undefined, ctx: OnMessageContext | OnCallBackQueryData): Promise<void> => {
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
        const msgId = (
          await ctx.reply('...', {
            message_thread_id:
              ctx.message?.message_thread_id ??
              ctx.message?.reply_to_message?.message_thread_id
          })
        ).message_id
        const messages = [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: { url: filePath }
              }
            ]
          }
        ]
        const model = ChatGPTModelsEnum.GPT_4_VISION_PREVIEW
        const completion = await chatCompletion(messages as any, model, true)
        if (completion) {
          await ctx.api
            .editMessageText(`${ctx.chat?.id}`, msgId, completion.completion)
            .catch(async (e: any) => {
              await this.onError(
                ctx,
                e,
                MAX_TRIES,
                'An error occurred while generating the AI edit'
              )
            })
          ctx.transient.analytics.sessionState = RequestState.Success
          ctx.transient.analytics.actualResponseTime = now()
          const price = getPromptPrice(completion.completion, {
            conversation: [],
            prompt,
            model,
            ctx
          })
          this.logger.info(
            `streamChatCompletion result = tokens: ${
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
