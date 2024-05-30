import { type BotPayments } from '../payment'
import {
  type OnMessageContext,
  type OnCallBackQueryData,
  type ChatConversation,
  RequestState
} from '../types'
import {
  getMessageExtras,
  getMinBalance,
  getPromptPrice,
  getUrlFromText,
  hasDallePrefix,
  MAX_TRIES,
  PRICE_ADJUSTMENT,
  promptHasBadWords,
  sendMessage,
  SupportedCommands
} from './utils/helpers'
import { type LlmCompletion } from './api/llmApi'
import { LlmsModelsEnum } from './utils/types'
import * as Sentry from '@sentry/node'
import { LlmsBase } from './llmsBase'
import config from '../../config'
import { now } from '../../utils/perf'
import { appText } from '../../utils/text'
import {
  chatCompletion,
  getDalleModel,
  getDalleModelPrice,
  postGenerateImg,
  streamChatCompletion,
  streamChatVisionCompletion
} from './api/openai'
import { type PhotoSize } from 'grammy/types'
import { InlineKeyboard } from 'grammy'

export class DalleBot extends LlmsBase {
  constructor (payments: BotPayments) {
    super(payments, 'DalleBot', 'dalle')
    if (!config.openAi.dalle.isEnabled) {
      this.logger.warn('DALL·E 2 Image Bot is disabled in config')
    }
  }

  public getEstimatedPrice (ctx: any): number {
    try {
      const session = this.getSession(ctx)
      if (
        ctx.hasCommand([
          SupportedCommands.dalle,
          SupportedCommands.dalleImg,
          SupportedCommands.dalleShort,
          SupportedCommands.dalleShorter
        ])
      ) {
        const imageNumber = session.numImages
        const imageSize = session.imgSize
        const model = getDalleModel(imageSize)
        const price = getDalleModelPrice(model, true, imageNumber) // cents
        return price * PRICE_ADJUSTMENT
      }
      return 0
    } catch (e) {
      Sentry.captureException(e)
      this.logger.error(`getEstimatedPrice error ${e}`)
      throw e
    }
  }

  public isSupportedEvent (
    ctx: OnMessageContext | OnCallBackQueryData
  ): boolean {
    const hasCommand = ctx.hasCommand([
      SupportedCommands.dalle,
      SupportedCommands.dalleImg,
      SupportedCommands.dalleShort,
      SupportedCommands.dalleShorter
    ])
    const session = this.getSession(ctx)
    const photo = ctx.message?.reply_to_message?.photo
    if (photo) {
      const imgId = photo?.[0].file_unique_id ?? ''
      if (session.imgInquiried.find((i) => i === imgId)) {
        return false
      }
    }
    const hasReply = this.isSupportedImageReply(ctx)
    const chatPrefix = this.hasPrefix(ctx.message?.text ?? '')
    if (chatPrefix !== '') {
      return true
    }

    const hasCallbackQuery = this.isSupportedCallbackQuery(ctx)

    return hasCommand || !!hasReply || hasCallbackQuery
  }

  public isSupportedCallbackQuery (
    ctx: OnMessageContext | OnCallBackQueryData
  ): boolean {
    if (!ctx.callbackQuery?.data) {
      return false
    }
    return ctx.callbackQuery?.data.startsWith('share-payload')
  }

  isSupportedImageReply (ctx: OnMessageContext | OnCallBackQueryData): boolean {
    const session = this.getSession(ctx)
    const photo = ctx.message?.photo ?? ctx.message?.reply_to_message?.photo
    if (photo && session.isEnabled) {
      const prompt = ctx.message?.caption ?? ctx.message?.text
      if (
        prompt &&
        (ctx.chat?.type === 'private' ||
          ctx.hasCommand(SupportedCommands.vision))
      ) {
        // && !isNaN(+prompt)
        return true
      }
      // removing alter image because uses dalle 2
      // else if (prompt && !isNaN(+prompt)) {
      //   return true
      // }
    }
    return false
  }

  async chatStreamCompletion (
    conversation: ChatConversation[],
    model: LlmsModelsEnum,
    ctx: OnMessageContext | OnCallBackQueryData,
    msgId: number,
    limitTokens: boolean
  ): Promise<LlmCompletion> {
    return await streamChatCompletion(
      conversation,
      ctx,
      model as LlmsModelsEnum,
      msgId,
      true // telegram messages has a character limit
    )
  }

  async chatCompletion (
    conversation: ChatConversation[],
    model: LlmsModelsEnum
  ): Promise<LlmCompletion> {
    return await chatCompletion(conversation, model)
  }

  hasPrefix (prompt: string): string {
    return (
      hasDallePrefix(prompt)
    )
  }

  public async onEvent (
    ctx: OnMessageContext | OnCallBackQueryData,
    refundCallback: (reason?: string) => void
  ): Promise<void> {
    ctx.transient.analytics.module = this.module
    const session = this.getSession(ctx)
    const isSupportedEvent = this.isSupportedEvent(ctx)
    if (!isSupportedEvent && ctx.chat?.type !== 'private') {
      this.logger.warn(`### unsupported command ${ctx.message?.text}`)
      return
    }

    if (this.isSupportedImageReply(ctx)) {
      const photo = ctx.message?.photo ?? ctx.message?.reply_to_message?.photo
      const prompt = ctx.message?.caption ?? ctx.message?.text ?? ''
      const imgId = photo?.[0].file_unique_id ?? ''
      if (!session.imgInquiried.find((i) => i === imgId)) {
        session.imgRequestQueue.push({
          prompt,
          photo,
          command: 'vision' // !isNaN(+prompt) ? 'alter' : 'vision'
        })
        if (!session.isProcessingQueue) {
          session.isProcessingQueue = true
          await this.onImgRequestHandler(ctx).then(() => {
            session.isProcessingQueue = false
          })
        }
      } else {
        refundCallback('This image was already inquired')
      }
      return
    }

    if (ctx.hasCommand(SupportedCommands.vision)) {
      const photoUrl = getUrlFromText(ctx)
      if (photoUrl) {
        const prompt = ctx.match
        session.imgRequestQueue.push({
          prompt,
          photoUrl,
          command: 'vision' // !isNaN(+prompt) ? 'alter' : 'vision'
        })
        if (!session.isProcessingQueue) {
          session.isProcessingQueue = true
          await this.onImgRequestHandler(ctx).then(() => {
            session.isProcessingQueue = false
          })
        }
      }
    }

    if (
      ctx.hasCommand([
        SupportedCommands.dalle,
        SupportedCommands.dalleImg,
        SupportedCommands.dalleShort,
        SupportedCommands.dalleShorter
      ]) ||
      hasDallePrefix(ctx.message?.text ?? '') !== '' ||
      (ctx.message?.text?.startsWith('image ') && ctx.chat?.type === 'private')
    ) {
      let prompt = (ctx.match ? ctx.match : ctx.message?.text) as string
      const prefix = hasDallePrefix(prompt)
      if (prefix) {
        prompt = prompt.slice(prefix.length)
      }
      if (!prompt || prompt.split(' ').length === 1) {
        prompt = config.openAi.dalle.defaultPrompt
      }
      if (promptHasBadWords(prompt)) {
        console.log(`### promptHasBadWords ${ctx.message?.text}`)
        await sendMessage(
          ctx,
          appText.maliciousPrompt
        )
        ctx.transient.analytics.sessionState = RequestState.Error
        ctx.transient.analytics.actualResponseTime = now()
        refundCallback('Prompt has bad words')
        return
      }
      session.imgRequestQueue.push({
        command: 'dalle',
        prompt
      })
      if (!session.isProcessingQueue) {
        session.isProcessingQueue = true
        await this.onImgRequestHandler(ctx).then(() => {
          session.isProcessingQueue = false
        })
      }
      return
    }

    ctx.transient.analytics.sessionState = RequestState.Error
    await sendMessage(ctx, '### unsupported command').catch(async (e) => {
      await this.onError(ctx, e, MAX_TRIES, '### unsupported command')
    })
    ctx.transient.analytics.actualResponseTime = now()
  }

  async onImgRequestHandler (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    const session = this.getSession(ctx)
    while (session.imgRequestQueue.length > 0) {
      try {
        const img = session.imgRequestQueue.shift()
        const minBalance = await getMinBalance(ctx, ctx.session.chatGpt.model)
        if (await this.hasBalance(ctx, minBalance)) {
          if (img?.command === 'dalle') {
            await this.onGenImgCmd(img?.prompt, ctx)
          } else {
            await this.onInquiryImage(img?.photo, img?.photoUrl, img?.prompt, ctx)
            if (img?.photo?.[0].file_unique_id) {
              session.imgInquiried.push(img?.photo?.[0].file_unique_id)
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

  async onGenImgCmd (prompt: string | undefined, ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    try {
      const session = this.getSession(ctx)
      if (session.isEnabled && ctx.chat?.id) {
        ctx.chatAction = 'upload_photo'
        // eslint-disable-next-line @typescript-eslint/naming-convention
        const { message_id } = await ctx.reply(
          'Generating image via OpenAI\'s DALL·E 3...', { message_thread_id: ctx.message?.message_thread_id }
        )
        const numImages = session.numImages
        const imgSize = session.imgSize
        const imgs = await postGenerateImg(prompt ?? '', numImages, imgSize)
        if (imgs.length > 0) {
          await Promise.all(imgs.map(async (img: any) => {
            if (session.isInscriptionLotteryEnabled) {
              const inlineKeyboard = new InlineKeyboard().text('Share to enter lottery', `share-payload|${session.imageGenerated.length}`) // ${imgs[0].url}
              const msgExtras = getMessageExtras({
                caption: `/dalle ${prompt}\n\n Check [q.country](https://q.country) for general lottery information`,
                reply_markup: inlineKeyboard,
                link_preview_options: { is_disabled: true },
                parseMode: 'Markdown'
              })
              const msg = await ctx.replyWithPhoto(img.url, msgExtras)
              const genImg = msg.photo
              const fileId = genImg?.pop()?.file_id
              session.imageGenerated.push({ prompt, photoUrl: img.url, photoId: fileId })
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

  onInquiryImage = async (photo: PhotoSize[] | undefined,
    photoUrl: string[] | undefined,
    prompt: string | undefined,
    ctx: OnMessageContext | OnCallBackQueryData): Promise<void> => {
    try {
      const session = this.getSession(ctx)
      if (session.isEnabled) {
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
        const model = LlmsModelsEnum.GPT_4_VISION_PREVIEW
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
}
