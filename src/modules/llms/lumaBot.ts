import { type BotPayments } from '../payment'
import {
  type OnMessageContext,
  type OnCallBackQueryData,
  type ChatConversation,
  RequestState
} from '../types'
import {
  MAX_TRIES,
  sendMessage
} from './utils/helpers'
import * as Sentry from '@sentry/node'
import { LlmsBase } from './llmsBase'
import config from '../../config'
import { now } from '../../utils/perf'
import { type ModelVersion } from './utils/llmModelsManager'
import { Callbacks } from './utils/types'
import { type LlmCompletion } from './api/llmApi'
import { getGeneration, lumaGeneration } from './api/luma'

interface VideoGeneration {
  msgId: number
  generationId: string
  prompt: string
}

export class LumaBot extends LlmsBase {
  private generationList: VideoGeneration[]

  constructor (payments: BotPayments) {
    super(payments, 'LumaBot', 'luma')
    this.generationList = []
    if (!config.luma.isEnabled) {
      this.logger.warn('Luma AI is disabled in config')
    }
  }

  public getEstimatedPrice (ctx: any): number {
    try {
      return 0
      // const session = this.getSession(ctx)
      // if (!this.commands) {
      //   throw new Error('Not command list found')
      // }
      // if (
      //   ctx.hasCommand(this.commands)
      // ) {
      //   const imageNumber = session.numImages
      //   const imageSize = session.imgSize
      //   const price = getDalleModelPrice(this.model, imageSize, true, imageNumber) // cents
      //   return price * PRICE_ADJUSTMENT
      // }
      // return 0
    } catch (e) {
      Sentry.captureException(e)
      this.logger.error(`getEstimatedPrice error ${e}`)
      throw e
    }
  }

  public isSupportedEvent (
    ctx: OnMessageContext | OnCallBackQueryData
  ): boolean {
    const hasCommand = ctx.hasCommand(this.supportedCommands)
    const chatPrefix = this.hasPrefix(ctx.message?.text ?? '')
    if (chatPrefix !== '') {
      return true
    }
    return hasCommand || this.isSupportedCallbackQuery(ctx)
  }

  public isSupportedCallbackQuery (
    ctx: OnMessageContext | OnCallBackQueryData
  ): boolean {
    if (!ctx.callbackQuery?.data) {
      return false
    }
    return ctx.callbackQuery?.data.startsWith(Callbacks.LumaDownloadVideo)
  }

  async chatStreamCompletion (
    conversation: ChatConversation[],
    model: ModelVersion,
    ctx: OnMessageContext | OnCallBackQueryData,
    msgId: number,
    limitTokens: boolean
  ): Promise<LlmCompletion> {
    throw new Error('chatStreamCompletion is not implemented for LumaAiBot')
  }

  async chatCompletion (
    conversation: ChatConversation[],
    model: ModelVersion
  ): Promise<LlmCompletion> {
    throw new Error('chatCompletion is not implemented for LumaAiBot')
  }

  public async onEvent (
    ctx: OnMessageContext | OnCallBackQueryData,
    refundCallback: (reason?: string) => void
  ): Promise<void> {
    ctx.transient.analytics.module = this.module

    const isSupportedEvent = this.isSupportedEvent(ctx)
    if (!isSupportedEvent && ctx.chat?.type !== 'private') {
      this.logger.warn(`### unsupported command ${ctx.message?.text}`)
      return
    }

    if (this.isSupportedCallbackQuery(ctx)) {
      if (ctx.callbackQuery?.data) {
        const data = ctx.callbackQuery.data.split(':')
        await this.onHandleVideoDownload(ctx, data[1])
        return
      }
    }

    const model = this.getModelFromContext(ctx)
    if (model) {
      await this.onGeneration(ctx)
      return
    }

    ctx.transient.analytics.sessionState = RequestState.Error
    await sendMessage(ctx, '### unsupported command').catch(async (e) => {
      await this.onError(ctx, e, MAX_TRIES, '### unsupported command')
    })
    ctx.transient.analytics.actualResponseTime = now()
  }

  private async onHandleVideoDownload (ctx: OnMessageContext | OnCallBackQueryData, generationId: string): Promise<void> {
    try {
      const generation = await getGeneration(generationId)
      const videoUrl = generation.assets?.video
      if (videoUrl && ctx.chatId) {
        const videoGeneration = this.generationList.find(gen => gen.generationId === generationId)
        if (videoGeneration) {
          await ctx.api.deleteMessages(ctx.chatId, [ctx.msgId, videoGeneration.msgId])
          await ctx.replyWithVideo(videoUrl, { caption: videoGeneration.prompt })
          this.generationList = this.generationList.filter(gen => gen.generationId !== generationId)
        }
      }
      await ctx.answerCallbackQuery('Video sent successfully')
    } catch (error) {
      console.error('Error in video download:', error)
      await ctx.answerCallbackQuery('Error processing video. Please try again.')
    }
  }

  async onGeneration (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    try {
      const chatId = ctx.chat?.id
      if (chatId) {
        const prompt = ctx.match
        const response = await lumaGeneration(chatId, prompt as string)
        const msgId = (
          await ctx.reply(`You are #${response.generationInProgress} in line for the video generation. The wait time is about ${response.queueTime} seconds.`, {
            message_thread_id:
              ctx.message?.message_thread_id ??
              ctx.message?.reply_to_message?.message_thread_id
          })
        ).message_id
        this.generationList.push({
          generationId: response.gnerationId,
          msgId,
          prompt: prompt as string
        })
      }
    } catch (e: any) {
      await this.onError(ctx, e)
    }
  }
}
