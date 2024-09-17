import { type BotPayments } from '../payment'
import {
  type OnMessageContext,
  type OnCallBackQueryData,
  type ChatConversation
} from '../types'
import {
  hasCommandPrefix,
  isMentioned,
  SupportedCommands
} from './utils/helpers'
import { type LlmCompletion } from './api/llmApi'

import { LlmsBase } from './llmsBase'
import { vertexCompletion, vertexStreamCompletion } from './api/vertex'
import { type SubagentBase } from '../subagents'
import {
  LlmModelsEnum,
  type ModelVersion
} from './utils/llmModelsManager'

export class VertexBot extends LlmsBase {
  private readonly geminiPrefix: string[]
  constructor (payments: BotPayments, subagents?: SubagentBase[]) {
    super(payments, 'VertexBot', 'llms', subagents)
    this.geminiPrefix = this.modelManager.getPrefixByModel(LlmModelsEnum.GEMINI_10) ?? []
  }

  public getEstimatedPrice (ctx: any): number {
    return 0
  }

  public isSupportedEvent (
    ctx: OnMessageContext | OnCallBackQueryData
  ): boolean {
    const hasCommand = ctx.hasCommand([
      this.commandsEnum.GEMINI,
      this.commandsEnum.G,
      this.commandsEnum.G15,
      this.commandsEnum.GEMINI15])
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

  hasPrefix (prompt: string): string {
    return (
      hasCommandPrefix(prompt, this.geminiPrefix)
    )
  }

  public async onEvent (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    ctx.transient.analytics.module = this.module
    const isSupportedEvent = this.isSupportedEvent(ctx)
    if (!isSupportedEvent && ctx.chat?.type !== 'private') {
      this.logger.warn(`### unsupported command ${ctx.message?.text}`)
      return
    }
    // if (ctx.hasCommand([SupportedCommands.bard, SupportedCommands.bardF]) || hasBardPrefix(ctx.message?.text ?? '')) {
    //   this.updateSessionModel(ctx, LlmsModelsEnum.BISON)
    //   await this.onChat(ctx, LlmsModelsEnum.BISON, false, false)
    //   return
    // }
    if (ctx.hasCommand([this.commandsEnum.GEMINI, this.commandsEnum.G]) || (hasCommandPrefix(ctx.message?.text ?? '', this.geminiPrefix))) {
      this.updateSessionModel(ctx, LlmModelsEnum.GEMINI_10)
      await this.onChat(ctx, LlmModelsEnum.GEMINI_10, true, false)
      return
    }
    if (ctx.hasCommand([this.commandsEnum.GEMINI15, this.commandsEnum.G15])) {
      this.updateSessionModel(ctx, LlmModelsEnum.GEMINI_15)
      await this.onChat(ctx, LlmModelsEnum.GEMINI_15, true, false)
      // return
    }

    if (ctx.hasCommand([SupportedCommands.pdf, SupportedCommands.ctx]) && this.checkModel(ctx)) {
      await this.onChat(ctx, ctx.session.currentModel, true, false)
    }
  }
}
