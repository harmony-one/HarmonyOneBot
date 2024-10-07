import { type BotPayments } from '../payment'
import {
  type OnMessageContext,
  type OnCallBackQueryData,
  type ChatConversation
} from '../types'
import { SupportedCommands } from './utils/helpers'
import { type LlmCompletion } from './api/llmApi'
import { anthropicCompletion, anthropicStreamCompletion, toolsChatCompletion } from './api/athropic'
import { LlmsBase } from './llmsBase'
import { type ModelVersion } from './utils/llmModelsManager'

export class ClaudeBot extends LlmsBase {
  private readonly claudeModels: ModelVersion[]

  constructor (payments: BotPayments) {
    super(payments, 'ClaudeBot', 'llms')
  }

  public getEstimatedPrice (ctx: any): number {
    return 0
  }

  public isSupportedEvent (
    ctx: OnMessageContext | OnCallBackQueryData
  ): boolean {
    const hasCommand = ctx.hasCommand(this.supportedCommands)

    if (ctx.hasCommand(SupportedCommands.new) && this.checkModel(ctx)) {
      return true
    }
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
    limitTokens: boolean): Promise<LlmCompletion> {
    return await anthropicStreamCompletion(
      conversation,
      model,
      ctx,
      msgId,
      true // telegram messages has a character limit
    )
  }

  async chatCompletion (
    conversation: ChatConversation[],
    model: ModelVersion,
    hasTools: boolean
  ): Promise<LlmCompletion> {
    if (hasTools) {
      return await toolsChatCompletion(conversation, model)
    }
    return await anthropicCompletion(conversation, model)
  }

  public async onEvent (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    ctx.transient.analytics.module = this.module
    const isSupportedEvent = this.isSupportedEvent(ctx)
    if (!isSupportedEvent && ctx.chat?.type !== 'private') {
      this.logger.warn(`### unsupported command ${ctx.message?.text}`)
      return
    }

    if (
      (ctx.hasCommand(SupportedCommands.new) && this.checkModel(ctx))
    ) {
      await this.onStop(ctx)
      await this.onChat(ctx, this.modelsEnum.CLAUDE_3_OPUS, true, false)
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
