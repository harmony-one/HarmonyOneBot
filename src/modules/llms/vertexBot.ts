import { type BotPayments } from '../payment'
import {
  type OnMessageContext,
  type OnCallBackQueryData,
  type ChatConversation
} from '../types'
import {
  isMentioned,
  SupportedCommands
} from './utils/helpers'
import { type LlmCompletion } from './api/llmApi'

import { LlmsBase } from './llmsBase'
import { vertexCompletion, vertexStreamCompletion } from './api/vertex'
import { type SubagentBase } from '../subagents'
import { type ModelVersion } from './utils/llmModelsManager'

export class VertexBot extends LlmsBase {
  constructor (payments: BotPayments, subagents?: SubagentBase[]) {
    super(payments, 'VertexBot', 'llms', subagents)
  }

  public getEstimatedPrice (ctx: any): number {
    return 0
  }

  public isSupportedEvent (
    ctx: OnMessageContext | OnCallBackQueryData
  ): boolean {
    const hasCommand = ctx.hasCommand(this.supportedCommands)
    if (isMentioned(ctx)) {
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
    return await vertexStreamCompletion(conversation,
      model,
      ctx,
      msgId,
      true // telegram messages has a character limit
    )
  }

  async chatCompletion (
    conversation: ChatConversation[],
    model: ModelVersion
  ): Promise<LlmCompletion> {
    return await vertexCompletion(conversation, model)
  }

  public async onEvent (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    ctx.transient.analytics.module = this.module
    const isSupportedEvent = this.isSupportedEvent(ctx)
    if (!isSupportedEvent && ctx.chat?.type !== 'private') {
      this.logger.warn(`### unsupported command ${ctx.message?.text}`)
      return
    }

    if (ctx.hasCommand([SupportedCommands.pdf, SupportedCommands.ctx]) && this.checkModel(ctx)) {
      await this.onChat(ctx, ctx.session.currentModel, true, false)
    }

    const model = this.getModelFromContext(ctx)
    if (!model) {
      this.logger.warn(`### unsupported model for command ${ctx.message?.text}`)
      return
    }
    this.updateSessionModel(ctx, model.version)

    await this.onChat(ctx, model.version, this.getStreamOption(model.version), false)
  }
}
