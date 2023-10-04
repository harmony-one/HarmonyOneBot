import { type OnMessageContext, type PayableBot, type RefundCallback, RequestState } from '../types'
import * as Sentry from '@sentry/node'
import { now } from '../../utils/perf'
import { llmAddUrlDocument } from '../llms/api/llmApi'
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
      const documentType = ctx.message.document?.mime_type
      if (documentType === 'application/pdf' && ctx.chat.id) {
        const url = file.getUrl()
        const fileName = ctx.message.document?.file_name ?? file.file_id
        await this.addDocToCollection(ctx, ctx.chat.id, fileName, url)
      }
      console.log(file)
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

  private async addDocToCollection (ctx: OnMessageContext, chatId: number, fileName: string, url: string): Promise<void> {
    const collectionName = await llmAddUrlDocument({
      chatId,
      url,
      fileName
    })
    ctx.session.collections.collectionRequestQueue.push({
      collectionName,
      collectionType: 'PDF',
      fileName,
      url
    })
    ctx.session.collections.isProcessingQueue = true
  }
}
