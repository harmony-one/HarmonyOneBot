import { type BotPayments } from '../payment'
import { now } from '../../utils/perf'
import { AgentBase } from './agentBase'
import { getUrlFromText } from '../llms/utils/helpers'
import { llmAddUrlDocument, llmCheckCollectionStatus, queryUrlDocument } from '../llms/api/llmApi'
import { ErrorHandler } from '../errorhandler'
import { sleep } from '../sd-images/utils'
import { RequestState, type ChatConversation, type Collection, type OnCallBackQueryData, type OnMessageContext, SubagentStatus } from '../types'
import config from '../../config'
import { type SubagentResult } from '../../modules/types'
import { appText } from '../../utils/text'

export class LlamaAgent extends AgentBase {
  errorHandler: ErrorHandler
  agentName: string

  constructor (payments: BotPayments, name: string) {
    super(payments, 'PDFAgent', 'chatGpt', appText.llamaURLContext)
    this.errorHandler = new ErrorHandler()
    this.agentName = name
  }

  public getEstimatedPrice (ctx: any): number {
    return 0
  }

  public isSupportedEvent (
    ctx: OnMessageContext | OnCallBackQueryData
  ): boolean {
    const hasPdf = this.isSupportedPdfReply(ctx)
    return !!hasPdf || this.isSupportedPdfFile(ctx)
  }

  public isSupportedSubagent (ctx: OnMessageContext | OnCallBackQueryData): boolean {
    return !!this.isSupportedPdfReply(ctx) || !!this.isSupportedUrl(ctx)
  }

  async checkStatus (ctx: OnMessageContext | OnCallBackQueryData, agent: SubagentResult): Promise<SubagentResult> {
    const session = this.getSession(ctx)
    return session.running.filter(subagents => subagents.id === agent.id && subagents.agentName === agent.agentName)[0]
  }

  public async run (ctx: OnMessageContext | OnCallBackQueryData, msg: ChatConversation): Promise<SubagentResult> {
    const session = this.getSession(ctx)
    const urls = this.isSupportedUrl(ctx)
    const id = msg.id ?? 0
    if (ctx.chat?.id) {
      if (urls && urls?.length > 0) {
        const collection = ctx.session.collections.activeCollections.find(c => c.url === urls[0])
        if (!collection) {
          await this.addUrlToCollection(ctx, ctx.chat?.id, urls[0], msg.content as string)
          if (!ctx.session.collections.isProcessingQueue) {
            ctx.session.collections.isProcessingQueue = true
            await this.onCheckCollectionStatus(ctx).then(() => {
              ctx.session.collections.isProcessingQueue = false
            })
          }
        } else {
          await this.queryUrlCollection(ctx, urls[0], msg.content as string)
        }
        const agent: SubagentResult = {
          id,
          agentName: this.agentName,
          completion: '',
          status: SubagentStatus.PROCESSING
        }
        session.subagentsRequestQueue.push(agent)
        if (!session.isProcessingQueue) {
          session.isProcessingQueue = true
          await this.onCheckAgentStatus(ctx).then(() => {
            session.isProcessingQueue = false
          })
        }
        return agent
      }
    }
    return {
      id,
      agentName: this.agentName,
      completion: '',
      status: SubagentStatus.NO_SUPPORTED_EVENT
    }
  }

  public async onEvent (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    ctx.transient.analytics.module = this.module
    const isSupportedEvent = this.isSupportedEvent(ctx)
    if (!isSupportedEvent && ctx.chat?.type !== 'private') {
      this.logger.warn(`### unsupported command ${ctx.message?.text}`)
      return
    }
    if (this.isSupportedPdfFile(ctx)) {
      await this.onPdfFileReceived(ctx)
    }
  }

  isSupportedPdfFile (ctx: OnMessageContext | OnCallBackQueryData): boolean {
    const documentType = ctx.message?.document?.mime_type
    const SupportedDocuments = { PDF: 'application/pdf' }
    if (documentType !== undefined && ctx.chat?.type === 'private') {
      return Object.values(SupportedDocuments).includes(documentType)
    }

    return false
  }

  public isSupportedPdfReply (ctx: OnMessageContext | OnCallBackQueryData): string | undefined {
    const documentType = ctx.message?.reply_to_message?.document?.mime_type
    if (documentType === 'application/pdf' && ctx.chat?.type === 'private') {
      return ctx.message?.reply_to_message?.document?.file_name
    }
    return undefined
  }

  public isSupportedUrl (ctx: OnMessageContext | OnCallBackQueryData): string[] | undefined {
    return getUrlFromText(ctx)
  }

  private async addUrlToCollection (ctx: OnMessageContext | OnCallBackQueryData, chatId: number, url: string, prompt: string): Promise<void> {
    const agentId = ctx.message?.message_id ?? ctx.message?.message_thread_id ?? 0
    const collectionName = await llmAddUrlDocument({
      chatId,
      url
    })
    const msgId = (await ctx.reply('...', {
      message_thread_id:
        ctx.message?.message_thread_id ??
        ctx.message?.reply_to_message?.message_thread_id
    })).message_id

    ctx.session.collections.collectionRequestQueue.push({
      collectionName,
      collectionType: 'URL',
      url: url.toLocaleLowerCase(),
      prompt,
      msgId,
      processingTime: 0,
      agentId
    })
  }

  private async addDocToCollection (ctx: OnMessageContext | OnCallBackQueryData, chatId: number, fileName: string, url: string, prompt: string): Promise<void> {
    const agentId = ctx.message?.message_id ?? ctx.message?.message_thread_id ?? 0
    const collectionName = await llmAddUrlDocument({
      chatId,
      url,
      fileName
    })
    const msgId = (await ctx.reply('...', {
      message_thread_id:
        ctx.message?.message_thread_id ??
        ctx.message?.reply_to_message?.message_thread_id
    })).message_id
    ctx.session.collections.collectionRequestQueue.push({
      agentId,
      collectionName,
      collectionType: 'PDF',
      fileName,
      url: url.toLocaleLowerCase(),
      prompt,
      msgId,
      processingTime: 0
    })
  }

  public async onPdfReplyHandler (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    try {
      const fileName = this.isSupportedPdfReply(ctx)
      const prompt = ctx.message?.text ?? 'Summarize this context'
      if (fileName !== '') {
        const collection = ctx.session.collections.activeCollections.find(c => c.fileName === fileName)
        if (collection) {
          await this.queryUrlCollection(ctx, collection.url, prompt)
        }
      }
      ctx.transient.analytics.actualResponseTime = now()
    } catch (e: any) {
      this.logger.error(`onPdfReplyHandler error: ${e}`)
      throw e
    }
  }

  private getCollectionConversation (ctx: OnMessageContext | OnCallBackQueryData, collection: Collection): ChatConversation[] {
    if (ctx.session.collections.currentCollection === collection.collectionName) {
      return ctx.session.collections.collectionConversation
    }
    ctx.session.collections.currentCollection = collection.collectionName
    return []
  }

  private async onPdfFileReceived (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    try {
      const file = await ctx.getFile()
      const documentType = ctx.message?.document?.mime_type
      if (documentType === 'application/pdf' && ctx.chat?.id && ctx.chat.type === 'private') {
        const url = file.getUrl()
        const fileName = ctx.message?.document?.file_name ?? file.file_id
        const prompt = ctx.message?.caption ?? 'Summarize this context' //  from the PDF file
        await this.addDocToCollection(ctx, ctx.chat.id, fileName, url, prompt)
        if (!ctx.session.collections.isProcessingQueue) {
          ctx.session.collections.isProcessingQueue = true
          await this.onCheckCollectionStatus(ctx).then(() => {
            ctx.session.collections.isProcessingQueue = false
          })
        }
      }
      ctx.transient.analytics.sessionState = RequestState.Success
    } catch (ex) {
      this.logger.error(`onPdfFileReceived error: ${ex}`)
      throw ex
    } finally {
      ctx.transient.analytics.actualResponseTime = now()
    }
  }

  async onUrlReplyHandler (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    try {
      const url = getUrlFromText(ctx)
      if (url) {
        const prompt = ctx.message?.text ?? 'summarize'
        const collection = ctx.session.collections.activeCollections.find(c => c.url === url[0])
        const newPrompt = `${prompt}` // ${url}
        if (collection) {
          await this.queryUrlCollection(ctx, url[0], newPrompt)
        }
        ctx.transient.analytics.actualResponseTime = now()
      }
    } catch (e: any) {
      this.logger.error(`onUrlReplyHandler: ${e.toString()}`)
      throw e
    }
  }

  async onCheckCollectionStatus (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    const processingTime = config.llms.processingTime
    while (ctx.session.collections.collectionRequestQueue.length > 0) {
      try {
        const collection = ctx.session.collections.collectionRequestQueue.shift()
        if (collection) {
          const result = await llmCheckCollectionStatus(collection?.collectionName ?? '')
          if (result.price > 0) {
            if (
              !(await this.payments.pay(ctx as OnMessageContext, result.price)) // price 0.05 x collections (chunks)
            ) {
              await this.onNotBalanceMessage(ctx)
            } else {
              ctx.session.collections.activeCollections.push(collection)
              if (collection.msgId) {
                const oneFee = await this.payments.getPriceInONE(result.price) // price in cents
                let statusMsg
                if (collection.collectionType === 'URL') {
                  statusMsg = `${collection.url} processed (${this.payments.toONE(oneFee, false).toFixed(2)} ONE fee)`
                } else {
                  statusMsg = `${collection.fileName} processed (${this.payments.toONE(oneFee, false).toFixed(2)} ONE fee)`
                }
                await ctx.api.editMessageText(ctx.chat?.id ?? '',
                  collection.msgId, statusMsg,
                  { link_preview_options: { is_disabled: true } })
                  .catch(async (e) => { await this.onError(ctx, e) })
              }
              await this.queryUrlCollection(ctx, collection.url, collection.prompt ?? '')
              // await this.queryUrlCollection(ctx, collection.url ?? '',
              //   collection.prompt ?? 'summary')
            }
          } else if (result.price < 0) {
            if (collection.msgId) {
              let statusMsg = ''
              if (collection.collectionType === 'URL') {
                statusMsg = `${collection.url} - Invalid URL`
              } else {
                statusMsg = `${collection.fileName} - Invalid PDF format`
              }
              await ctx.api.editMessageText(ctx.chat?.id ?? '', collection.msgId, statusMsg,
                { link_preview_options: { is_disabled: true } })
            }
          } else {
            if (collection.processingTime && collection.processingTime > processingTime) { // 5 min max
              if (collection.msgId) {
                let statusMsg = ''
                if (collection.collectionType === 'URL') {
                  statusMsg = `${collection.url} - Processing time limit reached. Please check the file format and try again`
                } else {
                  statusMsg = `${collection.fileName} - Processing time limit reached. Please check the file format and try again`
                }
                await ctx.api.editMessageText(ctx.chat?.id ?? '', collection.msgId, statusMsg,
                  { link_preview_options: { is_disabled: true } })
                ctx.session.subagents.running.push({
                  id: collection.agentId ?? 0,
                  agentName: this.agentName,
                  completion: '',
                  status: SubagentStatus.ERROR
                })
              }
            } else {
              const processingTime = collection.processingTime ? collection.processingTime + 5000 : 5000
              ctx.session.collections.collectionRequestQueue.push({ ...collection, processingTime })
              if (ctx.session.collections.collectionRequestQueue.length === 1) {
                await sleep(6000)
              } else {
                await sleep(3000)
              }
            }
          }
        }
        ctx.transient.analytics.actualResponseTime = now()
      } catch (e: any) {
        await this.onError(ctx, e)
      }
    }
  }

  private async queryUrlCollection (ctx: OnMessageContext | OnCallBackQueryData,
    url: string,
    prompt: string): Promise<void> {
    try {
      const session = this.getSession(ctx)
      const collection = ctx.session.collections.activeCollections.find(c => c.url === url)
      if (collection) {
        const conversation = this.getCollectionConversation(ctx, collection)
        if (conversation.length === 0) {
          conversation.push({
            role: 'system',
            content: `${collection.collectionType === 'PDF' ? 'The context comes from an URL linked to a PDF file' : 'The context comes from the web crawler of the given URL'}`
          })
        }
        const response = await queryUrlDocument({
          collectioName: collection.collectionName,
          prompt,
          conversation
        })
        const price = response.price * config.openAi.chatGpt.priceAdjustment
        if (
          !(await this.payments.pay(ctx as OnMessageContext, price))
        ) {
          await this.onNotBalanceMessage(ctx)
        } else {
          session.running.push({
            id: collection.agentId ?? 0,
            agentName: this.agentName,
            completion: this.completionContext.replace('%COMPLETION%', response.completion),
            status: SubagentStatus.DONE
          })
        }
      }
      ctx.transient.analytics.actualResponseTime = now()
    } catch (e: any) {
      await this.errorHandler.onCollectionError(ctx, e, this.logger, url)
    }
  }
}
