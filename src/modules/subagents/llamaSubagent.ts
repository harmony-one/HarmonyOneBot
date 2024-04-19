import { type BotPayments } from '../payment'
import { now } from '../../utils/perf'
import { SubagentBase } from './subagentBase'
import { SupportedCommands, getMsgEntities, sendMessage } from '../llms/utils/helpers'
import { llmAddUrlDocument, llmCheckCollectionStatus, queryUrlDocument } from '../llms/api/llmApi'
import { ErrorHandler } from '../errorhandler'
import { sleep } from '../sd-images/utils'
import {
  RequestState,
  type ChatConversation,
  type Collection, type OnCallBackQueryData,
  type OnMessageContext,
  type SubagentResult,
  SubagentStatus
} from '../types'
import config from '../../config'
import { appText } from '../../utils/text'

export class LlamaAgent extends SubagentBase {
  errorHandler: ErrorHandler

  constructor (payments: BotPayments, name: string) {
    super(payments, 'PDFAgent', name, appText.llamaURLContext)
    this.errorHandler = new ErrorHandler()
  }

  public getEstimatedPrice (ctx: any): number {
    return 0
  }

  public isSupportedEvent (
    ctx: OnMessageContext | OnCallBackQueryData
  ): boolean {
    return this.isSupportedPdfFile(ctx)
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

  public isSupportedSubagent (ctx: OnMessageContext | OnCallBackQueryData): boolean {
    return !!this.isSupportedPdfReply(ctx) || !!this.isSupportedUrl(ctx) || !!ctx.hasCommand(SupportedCommands.ctx)
  }

  async checkStatus (ctx: OnMessageContext | OnCallBackQueryData, agent: SubagentResult): Promise<SubagentResult> {
    const session = this.getSession(ctx)
    return session.running.filter(subagents => subagents.id === agent.id && subagents.name === agent.name)[0]
  }

  public async run (ctx: OnMessageContext | OnCallBackQueryData, msg: ChatConversation): Promise<SubagentResult> {
    const urls = this.isSupportedUrl(ctx)
    const fileName = this.isSupportedPdfReply(ctx) // ?? this.isValidSupportedPdfCommand(ctx)
    const hasCtxCommand = ctx.hasCommand(SupportedCommands.ctx)
    const id = msg.id ?? 0
    if (ctx.chat?.id) {
      if (urls && urls?.length > 0) {
        await Promise.all(urls.map(async url => {
          let collection = ctx.session.collections.activeCollections.find(c => c.url === url)
          if (!collection) {
            await this.addUrlToCollection(ctx, ctx.chat?.id, url, msg.content as string)
            if (!ctx.session.collections.isProcessingQueue) {
              ctx.session.collections.isProcessingQueue = true
              await this.onCheckCollectionStatus(ctx)
              ctx.session.collections.isProcessingQueue = false
            }
            collection = ctx.session.collections.activeCollections.find(c => c.url === url)
          }
          if (collection) {
            collection.agentId = id
            await this.queryUrlCollection(ctx, url, msg.content as string)
          }
        }))
      } else if (fileName !== undefined) {
        const collection = ctx.session.collections.activeCollections.find(c => c.fileName === fileName)
        if (!collection) {
          if (!ctx.session.collections.isProcessingQueue) {
            ctx.session.collections.isProcessingQueue = true
            await this.onCheckCollectionStatus(ctx).then(() => {
              ctx.session.collections.isProcessingQueue = false
            })
          }
        } else {
          collection.agentId = id
          await this.queryUrlCollection(ctx, collection.url, msg.content as string)
        }
      } else if (hasCtxCommand) {
        const collectionName = ctx.session.collections.currentCollection
        const collection = ctx.session.collections.activeCollections.find(c => c.collectionName === collectionName)
        if (collection && collectionName) {
          collection.agentId = id
          await this.queryUrlCollection(ctx, collection.url, msg.content as string)
        } else {
          await sendMessage(ctx, 'There is no active collection (url/pdf file)')
        }
      }
    }
    return {
      id,
      name: this.name,
      completion: '',
      status: SubagentStatus.NO_SUPPORTED_EVENT
    }
  }

  isSupportedPdfFile (ctx: OnMessageContext | OnCallBackQueryData): boolean {
    const documentType = ctx.message?.document?.mime_type
    const SupportedDocuments = { PDF: 'application/pdf' }
    if (documentType !== undefined && ctx.chat?.id && ctx.chat.type === 'private') {
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
    if (ctx.chat?.type === 'private') {
      return getMsgEntities(ctx, 'url')
    }
    return undefined
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
      if (documentType === 'application/pdf' && ctx.chat?.id && (ctx.hasCommand(SupportedCommands.pdf) || ctx.chat.type === 'private')) {
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

  async onCheckCollectionStatus (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    const processingTime = config.llms.processingTime
    const session = this.getSession(ctx)
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
                session.running.push({
                  id: collection.agentId ?? 0,
                  name: this.name,
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

  public isValidSupportedPdfCommand (ctx: OnMessageContext | OnCallBackQueryData): string | undefined {
    const documentType = ctx.message?.reply_to_message?.document?.mime_type
    if (documentType !== 'application/pdf' && ctx.chat?.type === 'private') {
      return undefined
    }
    return ctx.message?.reply_to_message?.document?.file_name
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
          const context = collection.collectionType === 'URL'
            ? this.completionContext.replace('%AGENT_OUTPUT%', response.completion)
              .replace('%URL%', collection.url)
            : appText.llamaPDFContext.replace('%AGENT_OUTPUT%', response.completion)
              .replace('%FILE%', collection.fileName ?? '')
          session.running.push({
            id: collection.agentId ?? 0,
            name: this.name,
            completion: context,
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
