import { type BotPayments } from '../payment'
import {
  type OnMessageContext,
  type OnCallBackQueryData,
  type ChatConversation,
  RequestState
} from '../types'
import {
  hasChatPrefix,
  hasDallePrefix,
  hasNewPrefix,
  isMentioned,
  sendMessage,
  SupportedCommands
} from './utils/helpers'
import { type LlmCompletion } from './api/llmApi'
import { LlmsModelsEnum } from './utils/types'
import * as Sentry from '@sentry/node'
import { LlmsBase } from './llmsBase'
import config from '../../config'
import { now } from '../../utils/perf'
import { appText } from '../../utils/text'
import {
  chatCompletion,
  streamChatCompletion
} from './api/openai'
import { LlamaAgent } from '../subagents'

export class OpenAIBot extends LlmsBase {
  constructor (payments: BotPayments) {
    super(payments, 'OpenAIBot', 'chatGpt')
    this.subagents.push(new LlamaAgent(payments, 'llamaAgent'))
    if (!config.openAi.dalle.isEnabled) {
      this.logger.warn('DALL·E 2 Image Bot is disabled in config')
    }
  }

  public getEstimatedPrice (ctx: any): number {
    try {
      return 0
    } catch (e) {
      Sentry.captureException(e)
      this.logger.error(`getEstimatedPrice error ${e}`)
      throw e
    }
  }

  public isSupportedEvent (
    ctx: OnMessageContext | OnCallBackQueryData
  ): boolean {
    const hasCommand = ctx.hasCommand([
      SupportedCommands.chat,
      SupportedCommands.ask,
      SupportedCommands.gpt4,
      SupportedCommands.gpt,
      SupportedCommands.ask32,
      SupportedCommands.ask35,
      SupportedCommands.new,
      SupportedCommands.last
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
    limitTokens: boolean
  ): Promise<LlmCompletion> {
    return await streamChatCompletion(
      conversation,
      ctx,
      model as LlmsModelsEnum,
      msgId,
      true // telegram messages has a character limit
    )
  }

  async chatCompletion (
    conversation: ChatConversation[],
    model: LlmsModelsEnum
  ): Promise<LlmCompletion> {
    return await chatCompletion(conversation, model)
  }

  hasPrefix (prompt: string): string {
    return (
      hasChatPrefix(prompt) || hasDallePrefix(prompt) || hasNewPrefix(prompt)
    )
  }

  public async onEvent (
    ctx: OnMessageContext | OnCallBackQueryData,
    refundCallback: (reason?: string) => void
  ): Promise<void> {
    ctx.transient.analytics.module = this.module
    const session = this.getSession(ctx)
    const isSupportedEvent = this.isSupportedEvent(ctx)
    if (!isSupportedEvent && ctx.chat?.type !== 'private') {
      this.logger.warn(`### unsupported command ${ctx.message?.text}`)
      return
    }

    if (
      ctx.hasCommand([
        SupportedCommands.chat,
        SupportedCommands.ask,
        SupportedCommands.gpt4,
        SupportedCommands.gpt
      ]) ||
      hasChatPrefix(ctx.message?.text ?? '') ||
      isMentioned(ctx) ||
      ((ctx.message?.text?.startsWith('chat ') ??
        ctx.message?.text?.startsWith('ask ')) &&
        ctx.chat?.type === 'private')
    ) {
      session.model = LlmsModelsEnum.GPT_4
      await this.onChat(ctx, LlmsModelsEnum.GPT_4, true)
      return
    }

    if (
      ctx.hasCommand(SupportedCommands.new) ||
      hasNewPrefix(ctx.message?.text ?? '') ||
      (ctx.message?.text?.startsWith('new ') && ctx.chat?.type === 'private')
    ) {
      await this.onStop(ctx)
      await this.onChat(ctx, LlmsModelsEnum.GPT_4, true)
      return
    }

    if (ctx.hasCommand(SupportedCommands.ask35)) {
      session.model = LlmsModelsEnum.GPT_35_TURBO_16K
      await this.onChat(ctx, LlmsModelsEnum.GPT_35_TURBO_16K, true)
      return
    }

    if (ctx.hasCommand(SupportedCommands.ask32)) {
      session.model = LlmsModelsEnum.GPT_4_32K
      await this.onChat(ctx, LlmsModelsEnum.GPT_4_32K, true)
      return
    }

    if (ctx.hasCommand(SupportedCommands.last)) {
      await this.onLast(ctx)
      return
    }

    if (ctx.chat?.type === 'private' || ctx.session.openAi.chatGpt.isFreePromptChatGroups) {
      await this.onChat(ctx, LlmsModelsEnum.GPT_4, true)
      return
    }

    ctx.transient.analytics.sessionState = RequestState.Error
    await sendMessage(ctx, '### unsupported command').catch(async (e) => {
      await this.onError(ctx, e, this.errorHandler.maxTries, '### unsupported command')
    })
    ctx.transient.analytics.actualResponseTime = now()
  }

  async onLast (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    const session = this.getSession(ctx)
    if (session.chatConversation.length > 0) {
      const chat = session.chatConversation
      ctx.transient.analytics.sessionState = RequestState.Success
      await sendMessage(
        ctx,
        `${appText.gptLast}\n_${chat[chat.length - 1].content}_`,
        { parseMode: 'Markdown' }
      ).catch(async (e) => {
        await this.onError(ctx, e)
      })
      ctx.transient.analytics.actualResponseTime = now()
    } else {
      ctx.transient.analytics.sessionState = RequestState.Error
      await sendMessage(ctx,
        'To start a conversation please write */ask*',
        { parseMode: 'Markdown' }).catch(async (e) => {
        await this.onError(ctx, e)
      })
      ctx.transient.analytics.actualResponseTime = now()
    }
  }
}
