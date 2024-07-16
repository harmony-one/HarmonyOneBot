import { type BotPayments } from '../payment'
import {
  type OnMessageContext,
  type OnCallBackQueryData,
  type ChatConversation
} from '../types'
import {
  hasBardPrefix,
  hasGeminiPrefix,
  isMentioned,
  SupportedCommands
} from './utils/helpers'
import { type LlmCompletion } from './api/llmApi'
import { LlmsModelsEnum } from './utils/types'

import { LlmsBase } from './llmsBase'
import { vertexCompletion, vertexStreamCompletion } from './api/vertex'
import { type SubagentBase } from '../subagents'

const models = [LlmsModelsEnum.BISON, LlmsModelsEnum.GEMINI, LlmsModelsEnum.GEMINI_15]
export class VertexBot extends LlmsBase {
  constructor (payments: BotPayments, subagents?: SubagentBase[]) {
    super(payments, 'VertexBot', 'llms', models, subagents)
  }

  public getEstimatedPrice (ctx: any): number {
    return 0
  }

  public isSupportedEvent (
    ctx: OnMessageContext | OnCallBackQueryData
  ): boolean {
    const hasCommand = ctx.hasCommand([
      // SupportedCommands.bard,
      // SupportedCommands.bardF,
      SupportedCommands.gemini,
      SupportedCommands.gShort,
      SupportedCommands.g15short,
      SupportedCommands.gemini15])
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
    model: LlmsModelsEnum,
    ctx: OnMessageContext | OnCallBackQueryData,
    msgId: number,
    limitTokens: boolean): Promise<LlmCompletion> {
    return await vertexStreamCompletion(conversation,
      model as LlmsModelsEnum,
      ctx,
      msgId,
      true // telegram messages has a character limit
    )
  }

  async chatCompletion (
    conversation: ChatConversation[],
    model: LlmsModelsEnum
  ): Promise<LlmCompletion> {
    return await vertexCompletion(conversation, model)
  }

  hasPrefix (prompt: string): string {
    return (
      hasGeminiPrefix(prompt) || hasBardPrefix(prompt)
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
    if (ctx.hasCommand([SupportedCommands.gemini, SupportedCommands.gShort]) || (hasGeminiPrefix(ctx.message?.text ?? '') !== '')) {
      this.updateSessionModel(ctx, LlmsModelsEnum.GEMINI)
      await this.onChat(ctx, LlmsModelsEnum.GEMINI, true, false)
      return
    }
    if (ctx.hasCommand([SupportedCommands.gemini15, SupportedCommands.g15short])) {
      this.updateSessionModel(ctx, LlmsModelsEnum.GEMINI_15)
      await this.onChat(ctx, LlmsModelsEnum.GEMINI_15, true, false)
      // return
    }

    if (ctx.hasCommand([SupportedCommands.pdf, SupportedCommands.ctx]) && this.checkModel(ctx)) {
      await this.onChat(ctx, ctx.session.currentModel, true, false)
    }
  }
}
