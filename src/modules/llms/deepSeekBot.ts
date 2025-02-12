import { type BotPayments } from '../payment'
import {
  type OnMessageContext,
  type OnCallBackQueryData,
  type ChatConversation
} from '../types'
import { deepSeekStreamCompletion } from './api/deepseek'
import { type LlmCompletion } from './api/llmApi'
import { LlmsBase } from './llmsBase'
import { type ModelVersion } from './utils/llmModelsManager'
import { type ModelParameters } from './utils/types'

export class DeepSeekBot extends LlmsBase {
  private readonly claudeModels: ModelVersion[]

  constructor (payments: BotPayments) {
    super(payments, 'deepSeekBot', 'llms')
  }

  public getEstimatedPrice (ctx: any): number {
    return 0
  }

  public isSupportedEvent (
    ctx: OnMessageContext | OnCallBackQueryData
  ): boolean {
    const hasCommand = ctx.hasCommand(this.supportedCommands)

    const chatPrefix = this.hasPrefix(ctx.message?.text ?? '')
    if (chatPrefix !== '') {
      return true
    }
    return hasCommand
  }

  async chatStreamCompletion (
    conversation: ChatConversation[],
    model: ModelVersion,
    ctx: OnMessageContext | OnCallBackQueryData,
    msgId: number,
    limitTokens: boolean,
    parameters?: ModelParameters): Promise<LlmCompletion> {
    if (parameters) {
      parameters.system = ctx.session.currentPrompt
    }
    return await deepSeekStreamCompletion(conversation, model, ctx, msgId, limitTokens, parameters)
  }

  async chatCompletion (
    conversation: ChatConversation[],
    model: ModelVersion,
    ctx: OnMessageContext | OnCallBackQueryData,
    hasTools: boolean,
    parameters?: ModelParameters
  ): Promise<LlmCompletion> {
    return {
      completion: undefined,
      usage: 0,
      price: 0,
      inputTokens: 0,
      outputTokens: 0
    }
  }

  public async onEvent (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    ctx.transient.analytics.module = this.module
    const isSupportedEvent = this.isSupportedEvent(ctx)
    if (!isSupportedEvent && ctx.chat?.type !== 'private') {
      this.logger.warn(`### unsupported command ${ctx.message?.text}`)
      return
    }
    const model = this.getModelFromContext(ctx)
    if (!model) {
      this.logger.warn(`### unsupported model for command ${ctx.message?.text}`)
      return
    }
    this.updateSessionModel(ctx, model.version)

    const usesTools = ctx.hasCommand([this.commandsEnum.CTOOL, this.commandsEnum.STOOL])
    await this.onChat(ctx, model.version, usesTools ? false : this.getStreamOption(model.version), usesTools)
  }
}
