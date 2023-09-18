import { type OnMessageContext, type RefundCallback } from '../types'
import pino, { type Logger } from 'pino'
import { chatCompletion, getChatModel, getChatModelPrice, getTokenNumber } from '../open-ai/api/openAi'
import config from '../../config'

enum SupportedCommands {
  Translate = 'translate',
  TranslateStop = 'translatestop'
}

export class TranslateBot {
  private readonly logger: Logger
  constructor () {
    this.logger = pino({
      name: 'TranslateBot',
      transport: {
        target: 'pino-pretty',
        options: { colorize: true }
      }
    })
  }

  public getEstimatedPrice (ctx: OnMessageContext): number {
    if (ctx.hasCommand(Object.values(SupportedCommands))) {
      return 0
    }

    const hasCommand = this.isCtxHasCommand(ctx)

    if (!hasCommand && ctx.session.translate.enable) {
      const message = ctx.message.text ?? ''
      const promptTokens = getTokenNumber(message)
      const modelPrice = getChatModel(config.openAi.chatGpt.model)

      const languageCount = ctx.session.translate.languages.length

      return getChatModelPrice(modelPrice, true, promptTokens, promptTokens * languageCount) *
        config.openAi.chatGpt.priceAdjustment
    }

    return 0
  }

  public isCtxHasCommand (ctx: OnMessageContext): boolean {
    const command = ctx.entities().find((ent) => ent.type === 'bot_command')
    return !!command
  }

  public isSupportedEvent (ctx: OnMessageContext): boolean {
    const hasCommand = this.isCtxHasCommand(ctx)
    return ctx.hasCommand(Object.values(SupportedCommands)) || (!hasCommand && ctx.session.translate.enable)
  }

  public async onEvent (ctx: OnMessageContext, refundCallback: RefundCallback): Promise<{ next: boolean }> {
    if (!this.isSupportedEvent(ctx)) {
      await ctx.reply(`Unsupported command: ${ctx.message?.text}`, { message_thread_id: ctx.message?.message_thread_id })
      refundCallback('Unsupported command')
      return { next: true }
    }

    if (ctx.hasCommand(SupportedCommands.Translate)) {
      await this.runTranslate(ctx)
      return { next: false }
    }

    if (ctx.hasCommand(SupportedCommands.TranslateStop)) {
      await this.stopTranslate(ctx)
      return { next: false }
    }

    const hasCommand = ctx.entities().find((ent) => ent.type === 'bot_command')

    if (!hasCommand && ctx.session.translate.enable) {
      await this.onTranslate(ctx)
      return { next: false }
    }

    refundCallback('Unsupported command')
    return { next: true }
  }

  public parseCommand (message: string): string[] {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, ...lang] = message.split(' ')
    return lang
  }

  public async runTranslate (ctx: OnMessageContext): Promise<void> {
    ctx.chatAction = 'typing'
    const langList = this.parseCommand(ctx.message?.text ?? '')

    ctx.session.translate = {
      languages: langList,
      enable: true
    }

    await ctx.reply(`Got it. I will translate the following messages into these languages:
${langList.join(', ')}

To disable translation, use the command /translatestop.`)
  }

  public async stopTranslate (ctx: OnMessageContext): Promise<void> {
    ctx.chatAction = 'typing'
    ctx.session.translate.enable = false
    await ctx.reply('Translation is disabled', { message_thread_id: ctx.message?.message_thread_id })
  }

  public async onTranslate (ctx: OnMessageContext): Promise<void> {
    const message = ctx.message.text

    const progressMessage = await ctx.reply('...', { message_thread_id: ctx.message?.message_thread_id })
    ctx.chatAction = 'typing'

    if (!message) {
      return
    }

    const prompt = `Translate the message below into: ${ctx.session.translate.languages.join(', ')}\n Message: ${message}`
    const conversation = [{ role: 'user', content: prompt }]

    const response = await chatCompletion(conversation)

    await ctx.api.editMessageText(ctx.chat?.id, progressMessage.message_id, response.completion, { parse_mode: 'Markdown' })
  }
}
