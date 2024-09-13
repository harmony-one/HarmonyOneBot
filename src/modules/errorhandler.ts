import { AxiosError } from 'axios'
import * as Sentry from '@sentry/node' // Import Sentry for error capturing
import { RequestState, type OnCallBackQueryData, type OnMessageContext } from './types'
import { sleep } from './sd-images/utils'
import { type Logger } from 'pino'
import { GrammyError } from 'grammy'
import { sendMessage } from './llms/utils/helpers'
import { now } from '../utils/perf'
import OpenAI from 'openai'

// const MAX_TRIES = 3 // Define the maximum number of retries

class ErrorHandler {
  public maxTries = 3

  private writeLog (ctx: OnMessageContext | OnCallBackQueryData, errorMessage: string, logger: Logger): void {
    const user = ctx.from.username ? ctx.from.username : ''
    const msg = ctx.message?.text
    logger.error(`Error msg:: ${errorMessage} | from user ${user} | msg::${msg}`)
  }

  async onError (
    ctx: OnMessageContext | OnCallBackQueryData,
    e: any,
    retryCount: number = this.maxTries,
    logger: Logger,
    msg = '',
    onStop?: (ctx: OnMessageContext | OnCallBackQueryData) => Promise<void>
  ): Promise<void> {
    ctx.transient.analytics.sessionState = RequestState.Error
    Sentry.setContext('llms', { retryCount, msg })
    Sentry.captureException(e)
    ctx.chatAction = null
    if (retryCount === 0) {
      // Retry limit reached, log an error or take alternative action
      logger.error(`Retry limit reached for error: ${e}`)
      return
    }
    if (e instanceof GrammyError) {
      if (e.error_code === 400 && e.description.includes('not enough rights')) {
        const errorMsg = 'Error: The bot does not have permission to send photos in chat'
        this.writeLog(ctx, errorMsg, logger)
        await sendMessage(ctx, errorMsg)
        ctx.transient.analytics.actualResponseTime = now()
      } else if (e.error_code === 429) {
        const retryAfter = e.parameters.retry_after
          ? e.parameters.retry_after < 60
            ? 60
            : e.parameters.retry_after * 2
          : 60
        const method = e.method
        const errorMessage = `On method "${method}" | ${e.error_code} - ${e.description}`
        this.writeLog(ctx, errorMessage, logger)
        logger.error(errorMessage)
        await sendMessage(
          ctx,
          `${
            ctx.from.username ? ctx.from.username : ''
          } Bot has reached limit, wait ${retryAfter} seconds`
        ).catch(async (e) => { await this.onError(ctx, e, retryCount - 1, logger) })
        ctx.transient.analytics.actualResponseTime = now()
        if (method === 'editMessageText') {
          ctx.session.llms.chatConversation.pop() // deletes last prompt
        }
        await sleep(retryAfter * 1000) // wait retryAfter seconds to enable bot
      } else {
        const errorMsg = `On method "${e.method}" | ${e.error_code} - ${e.description}`
        this.writeLog(ctx, errorMsg, logger)
        ctx.transient.analytics.actualResponseTime = now()
        await sendMessage(ctx, 'Error handling your request').catch(async (e) => { await this.onError(ctx, e, retryCount - 1, logger) })
      }
    } else if (e instanceof OpenAI.APIError) {
      // 429 RateLimitError
      // e.status = 400 || e.code = BadRequestError
      const errorMsg = `OPENAI Error ${e.status}(${e.code}) - ${e.message}`
      this.writeLog(ctx, errorMsg, logger)
      if (e.code === 'context_length_exceeded') {
        await sendMessage(ctx, e.message).catch(async (e) => { await this.onError(ctx, e, retryCount - 1, logger) })
        ctx.transient.analytics.actualResponseTime = now()
        onStop && await onStop(ctx)
      } else if (e.code === 'content_policy_violation') {
        await sendMessage(ctx, e.message).catch(async (e) => { await this.onError(ctx, e, retryCount - 1, logger) })
        ctx.transient.analytics.actualResponseTime = now()
        onStop && await onStop(ctx)
      } else {
        await sendMessage(
          ctx,
          'Error accessing OpenAI (ChatGPT). Please try later'
        ).catch(async (e) => { await this.onError(ctx, e, retryCount - 1, logger) })
        ctx.transient.analytics.actualResponseTime = now()
      }
    } else if (e instanceof AxiosError) {
      const errorMsg = `${e.message}`
      this.writeLog(ctx, errorMsg, logger)
      await sendMessage(ctx, 'Error handling your request').catch(async (e) => {
        await this.onError(ctx, e, retryCount - 1, logger)
      })
    } else {
      const errorMsg = `${e.toString()}`
      this.writeLog(ctx, errorMsg, logger)
      logger.error(e)
      await sendMessage(ctx, 'Error handling your request')
        .catch(async (e) => { await this.onError(ctx, e, retryCount - 1, logger) }
        )
      ctx.transient.analytics.actualResponseTime = now()
    }
  }

  async onCollectionError (
    ctx: OnMessageContext | OnCallBackQueryData,
    e: any, logger: Logger, url: string): Promise<void> {
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
        await this.onError(ctx, e, this.maxTries, logger)
      }
    } else {
      await this.onError(ctx, e, this.maxTries, logger)
    }
  }
}

export { ErrorHandler }
