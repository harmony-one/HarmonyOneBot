import { type BotPayments } from '../payment'
import {
  type OnMessageContext,
  type OnCallBackQueryData,
  type ChatConversation,
  RequestState
} from '../types'
import {
  hasNewPrefix,
  isMentioned,
  sendMessage,
  SupportedCommands
} from './utils/helpers'
import { type LlmCompletion } from './api/llmApi'
import { Sentry } from '../../monitoring/instrument'
import { LlmsBase } from './llmsBase'
import config from '../../config'
import { now } from '../../utils/perf'
import { appText } from '../../utils/text'
import {
  chatCompletion,
  streamChatCompletion
} from './api/openai'
import { type SubagentBase } from '../subagents'
import { type ModelVersion } from './utils/llmModelsManager'
import { type ModelParameters } from './utils/types'

export class OpenAIBot extends LlmsBase {
  constructor (payments: BotPayments, subagents?: SubagentBase[]) {
    super(payments, 'OpenAIBot', 'chatGpt', subagents)
    // this.gpt4oPrefix = this.modelManager.getPrefixByModel(this.modelsEnum.GPT_4O) ?? []
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
    const commands = ['last', ...this.supportedCommands]
    const hasCommand = ctx.hasCommand(commands)
    // if (ctx.hasCommand(SupportedCommands.new) && this.checkModel(ctx)) {
    //   return true
    // }
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
    limitTokens = true, // boolean,
    parameters?: ModelParameters
  ): Promise<LlmCompletion> {
    return await streamChatCompletion(
      conversation,
      model,
      ctx,
      msgId,
      true, // telegram messages has a character limit
      parameters
    )
  }

  async chatCompletion (
    conversation: ChatConversation[],
    model: ModelVersion,
    ctx: OnMessageContext | OnCallBackQueryData,
    usesTools: boolean,
    parameters?: ModelParameters
  ): Promise<LlmCompletion> {
    return await chatCompletion(conversation, model, ctx, model !== this.modelsEnum.O1, parameters) // limitTokens doesn't apply for o1-preview
  }

  hasPrefix (prompt: string): string {
    return (
      this.supportedPrefixes.find(prefix => prompt.toLocaleLowerCase().startsWith(prefix)) ??
      hasNewPrefix(prompt) // hasDallePrefix(prompt)
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

    if ((ctx.message?.text?.startsWith('chat ') ??
        ctx.message?.text?.startsWith('ask ')) &&
        ctx.chat?.type === 'private') {
      this.updateSessionModel(ctx, this.modelsEnum.GPT_4O)
      await this.onChat(ctx, this.modelsEnum.GPT_4O, true, false)
      return
    }

    if (ctx.hasCommand([SupportedCommands.pdf, SupportedCommands.ctx]) && this.checkModel(ctx)) {
      await this.onChat(ctx, ctx.session.currentModel, true, false)
      return
    }

    // if (
    //   (ctx.hasCommand(SupportedCommands.new) ||
    //   hasNewPrefix(ctx.message?.text ?? '') ||
    //   (ctx.message?.text?.startsWith('new ') && ctx.chat?.type === 'private') && this.checkModel(ctx))
    // ) {
    //   await this.onStop(ctx)
    //   this.updateSessionModel(ctx, this.modelsEnum.GPT_4O)
    //   await this.onChat(ctx, this.modelsEnum.GPT_4O, true, false)
    //   return
    // }

    const model = this.getModelFromContext(ctx)
    if (model) {
      this.updateSessionModel(ctx, model.version)
      await this.onChat(ctx, model.version, this.getStreamOption(model.version), false)
      return
    }

    if (ctx.hasCommand(SupportedCommands.last)) {
      await this.onLast(ctx)
      return
    }

    if (ctx.chat?.type === 'private' || session.isFreePromptChatGroups) {
      this.updateSessionModel(ctx, this.modelsEnum.GPT_4O)
      await this.onChat(ctx, this.modelsEnum.GPT_4O, true, false)
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
