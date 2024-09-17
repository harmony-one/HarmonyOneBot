import { type BotPayments } from '../payment'
import {
  type OnMessageContext,
  type OnCallBackQueryData,
  type ChatConversation
} from '../types'
import { hasCommandPrefix, SupportedCommands } from './utils/helpers'
import { type LlmCompletion } from './api/llmApi'
import { anthropicCompletion, anthropicStreamCompletion, toolsChatCompletion } from './api/athropic'
import { LlmsBase } from './llmsBase'
import { type ModelVersion } from './utils/llmModelsManager'

export class ClaudeBot extends LlmsBase {
  private readonly opusPrefix: string[]

  constructor (payments: BotPayments) {
    super(payments, 'ClaudeBot', 'llms')
    this.opusPrefix = this.modelManager.getPrefixByModel(this.modelsEnum.CLAUDE_3_OPUS) ?? []
  }

  public getEstimatedPrice (ctx: any): number {
    return 0
  }

  public isSupportedEvent (
    ctx: OnMessageContext | OnCallBackQueryData
  ): boolean {
    const hasCommand = ctx.hasCommand([
      this.commandsEnum.CLAUDE,
      this.commandsEnum.OPUS,
      this.commandsEnum.O,
      this.commandsEnum.C,
      this.commandsEnum.CTOOL,
      this.commandsEnum.STOOL,
      this.commandsEnum.CLAUDES,
      this.commandsEnum.SONNET,
      this.commandsEnum.S,
      this.commandsEnum.HAIKU,
      this.commandsEnum.H])

    if (ctx.hasCommand(SupportedCommands.new) && this.checkModel(ctx)) {
      return true
    }
    const chatPrefix = this.hasPrefix(ctx.message?.text ?? '')
    if (chatPrefix !== '') {
      return true
    }
    return hasCommand
  }

  hasPrefix (prompt: string): string {
    return (
      hasCommandPrefix(prompt, this.opusPrefix)
    )
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
    if (ctx.hasCommand([this.commandsEnum.CTOOL])) {
      this.updateSessionModel(ctx, this.modelsEnum.CLAUDE_3_OPUS)
      await this.onChat(ctx, this.modelsEnum.CLAUDE_3_OPUS, false, true)
      return
    }
    if (ctx.hasCommand([this.commandsEnum.STOOL])) {
      this.updateSessionModel(ctx, this.modelsEnum.CLAUDE_35_SONNET)
      await this.onChat(ctx, this.modelsEnum.CLAUDE_35_SONNET, false, true)
      return
    }
    if (
      (ctx.hasCommand(SupportedCommands.new) && this.checkModel(ctx))
    ) {
      await this.onStop(ctx)
      await this.onChat(ctx, this.modelsEnum.CLAUDE_3_OPUS, true, false)
      return
    }
    if (ctx.hasCommand([
      this.commandsEnum.CLAUDE,
      this.commandsEnum.OPUS,
      this.commandsEnum.O,
      this.commandsEnum.C]) ||
      (hasCommandPrefix(ctx.message?.text ?? '', this.opusPrefix) !== '')
    ) {
      this.updateSessionModel(ctx, this.modelsEnum.CLAUDE_3_OPUS)
      await this.onChat(ctx, this.modelsEnum.CLAUDE_3_OPUS, true, false)
      return
    }
    if (ctx.hasCommand([this.commandsEnum.CLAUDES, this.commandsEnum.SONNET, this.commandsEnum.S])) {
      this.updateSessionModel(ctx, this.modelsEnum.CLAUDE_35_SONNET)
      await this.onChat(ctx, this.modelsEnum.CLAUDE_35_SONNET, true, false)
      return
    }
    if (ctx.hasCommand([this.commandsEnum.HAIKU, this.commandsEnum.H])) {
      this.updateSessionModel(ctx, this.modelsEnum.CLAUDE_3_HAIKU)
      await this.onChat(ctx, this.modelsEnum.CLAUDE_3_HAIKU, false, false)
    }
  }
}
