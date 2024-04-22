import { type BotPayments } from '../payment'
import {
  type OnMessageContext,
  type OnCallBackQueryData,
  type ChatConversation
} from '../types'
import {
  hasClaudeOpusPrefix,
  isMentioned,
  SupportedCommands
} from './utils/helpers'
import { type LlmCompletion } from './api/llmApi'
import { LlmsModelsEnum } from './utils/types'

import { anthropicCompletion, anthropicStreamCompletion } from './api/athropic'
import { LlmsBase } from './llmsBase'

const models = [
  LlmsModelsEnum.CLAUDE_HAIKU,
  LlmsModelsEnum.CLAUDE_OPUS,
  LlmsModelsEnum.CLAUDE_SONNET
]

export class ClaudeBot extends LlmsBase {
  constructor (payments: BotPayments) {
    super(payments, 'ClaudeBot', 'llms', models)
  }

  public getEstimatedPrice (ctx: any): number {
    return 0
  }

  public isSupportedEvent (
    ctx: OnMessageContext | OnCallBackQueryData
  ): boolean {
    const hasCommand = ctx.hasCommand([SupportedCommands.claudeOpus,
      SupportedCommands.opus,
      SupportedCommands.opusShort,
      SupportedCommands.claudeShort,
      SupportedCommands.claudeShortTools,
      SupportedCommands.claudeSonnet,
      SupportedCommands.sonnet,
      SupportedCommands.sonnetShort,
      SupportedCommands.claudeHaiku,
      SupportedCommands.haikuShort])
    if (isMentioned(ctx)) {
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
      hasClaudeOpusPrefix(prompt)
    )
  }

  async chatStreamCompletion (
    conversation: ChatConversation[],
    model: LlmsModelsEnum,
    ctx: OnMessageContext | OnCallBackQueryData,
    msgId: number,
    limitTokens: boolean): Promise<LlmCompletion> {
    return await anthropicStreamCompletion(
      conversation,
      model as LlmsModelsEnum,
      ctx,
      msgId,
      true // telegram messages has a character limit
    )
  }

  async chatCompletion (
    conversation: ChatConversation[],
    model: LlmsModelsEnum,
    hasTools: boolean
  ): Promise<LlmCompletion> {
    return await anthropicCompletion(conversation, hasTools, model)
  }

  public async onEvent (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    ctx.transient.analytics.module = this.module
    const isSupportedEvent = this.isSupportedEvent(ctx)
    if (!isSupportedEvent && ctx.chat?.type !== 'private') {
      this.logger.warn(`### unsupported command ${ctx.message?.text}`)
      return
    }
    if (ctx.hasCommand([SupportedCommands.claudeShortTools])) {
      await this.onChat(ctx, LlmsModelsEnum.CLAUDE_OPUS, false, true)
      return
    }
    if (ctx.hasCommand([
      SupportedCommands.claudeOpus,
      SupportedCommands.opus,
      SupportedCommands.opusShort,
      SupportedCommands.claudeShort]) ||
      (hasClaudeOpusPrefix(ctx.message?.text ?? '') !== '')
    ) {
      await this.onChat(ctx, LlmsModelsEnum.CLAUDE_OPUS, false, false) // true)
      return
    }
    if (ctx.hasCommand([SupportedCommands.claudeSonnet, SupportedCommands.sonnet, SupportedCommands.sonnetShort])) {
      await this.onChat(ctx, LlmsModelsEnum.CLAUDE_SONNET, true, false)
      return
    }
    if (ctx.hasCommand([SupportedCommands.claudeHaiku, SupportedCommands.haikuShort])) {
      await this.onChat(ctx, LlmsModelsEnum.CLAUDE_HAIKU, false, false)
    }
  }
}