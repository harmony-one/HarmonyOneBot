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
import { llmCompletion, type LlmCompletion } from './api/llmApi'
import { LlmsModelsEnum } from './utils/types'
import { LlmsBase } from './llmsBase'

const models = [LlmsModelsEnum.J2_ULTRA]

export class LlmsBot extends LlmsBase {
  constructor (payments: BotPayments) {
    super(payments, 'LlmsBot', 'llms', models)
    // this.supportedModels = models
  }

  public getEstimatedPrice (ctx: any): number {
    return 0
  }

  public isSupportedEvent (
    ctx: OnMessageContext | OnCallBackQueryData
  ): boolean {
    const hasCommand = ctx.hasCommand([
      SupportedCommands.j2Ultra
    ])
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
    return {
      completion: undefined,
      usage: 0,
      price: 0,
      inputTokens: 0,
      outputTokens: 0
    }
  }

  async chatCompletion (
    conversation: ChatConversation[],
    model: LlmsModelsEnum
  ): Promise<LlmCompletion> {
    return await llmCompletion(conversation, model)
  }

  hasPrefix (prompt: string): string {
    return ''
  }

  public async onEvent (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    ctx.transient.analytics.module = this.module
    const isSupportedEvent = this.isSupportedEvent(ctx)
    if (!isSupportedEvent && ctx.chat?.type !== 'private') {
      this.logger.warn(`### unsupported command ${ctx.message?.text}`)
      return
    }
    if (ctx.hasCommand(SupportedCommands.j2Ultra)) {
      this.updateSessionModel(ctx, LlmsModelsEnum.J2_ULTRA)
      await this.onChat(ctx, LlmsModelsEnum.J2_ULTRA, false, false)
    }
  }
}
