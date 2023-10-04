import { type OnMessageContext, type PayableBot, type RefundCallback, RequestState } from '../types'
import * as Sentry from '@sentry/node'
import { now } from '../../utils/perf'
import { llmAddUrlDocument } from '../llms/api/llmApi'
import { type Logger, pino } from 'pino'
import { GrammyError } from 'grammy'
import { sendMessage } from '../open-ai/helpers'
import { sleep } from '../sd-images/utils'
import { AxiosError } from 'axios'

const SupportedDocuments = { PDF: 'application/pdf' }

const MAX_TRIES = 3
export class DocumentHandler implements PayableBot {
  public readonly module = 'DocumentHandler'
  private readonly logger: Logger

  constructor () {
    this.logger = pino({
      name: 'OpenAIBot',
      transport: {
        target: 'pino-pretty',
        options: { colorize: true }
      }
    })
  }

  public getEstimatedPrice (ctx: OnMessageContext): number {
    return 1
  }

  public async onEvent (ctx: OnMessageContext, refundCallback: RefundCallback): Promise<void> {
    ctx.transient.analytics.module = this.module
    try {
      const file = await ctx.getFile()
      const documentType = ctx.message.document?.mime_type
      if (documentType === 'application/pdf' && ctx.chat.id) {
        const url = file.getUrl()
        const fileName = ctx.message.document?.file_name ?? file.file_id
        const prompt = ctx.message.caption ?? ''
        await this.addDocToCollection(ctx, ctx.chat.id, fileName, url, prompt)
      }
      ctx.transient.analytics.sessionState = RequestState.Success
    } catch (ex) {
      Sentry.captureException(ex)
      ctx.transient.analytics.sessionState = RequestState.Error
    } finally {
      ctx.transient.analytics.actualResponseTime = now()
    }
  }

  public isSupportedEvent (ctx: OnMessageContext): boolean {
    const documentType = ctx.message.document?.mime_type

    if (documentType !== undefined) {
      return Object.values(SupportedDocuments).includes(documentType)
    }
    return false
  }

  private async addDocToCollection (ctx: OnMessageContext, chatId: number, fileName: string, url: string, prompt: string): Promise<void> {
    try {
      const collectionName = await llmAddUrlDocument({
        chatId,
        url,
        fileName
      })
      ctx.session.collections.collectionRequestQueue.push({
        collectionName,
        collectionType: 'PDF',
        fileName,
        url,
        prompt
      })
    } catch (e: any) {
      await this.onError(ctx, e)
    }
  }

  async onError (
    ctx: OnMessageContext,
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
      } else {
        this.logger.error(
          `On method "${ex.method}" | ${ex.error_code} - ${ex.description}`
        )
        await sendMessage(ctx, 'Error handling your request').catch(async (e) => {
          await this.onError(ctx, e, retryCount - 1)
        })
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
