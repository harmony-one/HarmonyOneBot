import { type OnMessageContext, type RefundCallback } from '../types'

const SupportedDocuments = { PDF: 'application/pdf' }

export class DocumentHandler {
  public async onEvent (ctx: OnMessageContext, refundCallback: RefundCallback): Promise<void> {
    try {
      const file = await ctx.getFile()
      console.log(file)
      await ctx.reply('you did it kid')
    } catch (error) {
      console.error('Error:', error)
      await ctx.reply('you failed kid')
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
