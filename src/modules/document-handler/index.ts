import { type OnMessageContext, type PayableBot, type RefundCallback, RequestState } from '../types'
import * as Sentry from '@sentry/node'
import { now } from '../../utils/perf'

const SupportedDocuments = { PDF: 'application/pdf' }

export class DocumentHandler implements PayableBot {
  public readonly module = 'DocumentHandler'
  public getEstimatedPrice (ctx: OnMessageContext): number {
    return 1
  }

  public async onEvent (ctx: OnMessageContext, refundCallback: RefundCallback): Promise<void> {
    ctx.transient.analytics.module = this.module
    try {
      const file = await ctx.getFile()
      console.log(file)
      await ctx.reply('you did it kid')
      ctx.transient.analytics.sessionState = RequestState.Success
    } catch (ex) {
      Sentry.captureException(ex)
      await ctx.reply('you failed kid')
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
}
