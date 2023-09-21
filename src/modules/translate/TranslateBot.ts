import { type OnMessageContext, type PayableBot, type RefundCallback, SessionState } from '../types'
import pino, { type Logger } from 'pino'
import { chatCompletion, getChatModel, getChatModelPrice, getTokenNumber } from '../open-ai/api/openAi'
import config from '../../config'

enum SupportedCommands {
  Translate = 'translate',
  TranslateStop = 'translatestop'
}

export class TranslateBot implements PayableBot {
  public readonly module = 'TranslateBot'
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

  public async onEvent (ctx: OnMessageContext, refundCallback: RefundCallback): Promise<void> {
    ctx.session.analytics.module = this.module
    if (!this.isSupportedEvent(ctx)) {
      await ctx.reply(`Unsupported command: ${ctx.message?.text}`, { message_thread_id: ctx.message?.message_thread_id })
      ctx.session.analytics.actualResponseTime = process.hrtime.bigint()
      ctx.session.analytics.sessionState = SessionState.Error
      refundCallback('Unsupported command')
      return
    }

    if (ctx.hasCommand(SupportedCommands.Translate)) {
      await this.runTranslate(ctx)
      return
    }

    if (ctx.hasCommand(SupportedCommands.TranslateStop)) {
      await this.stopTranslate(ctx)
      return
    }

    const hasCommand = ctx.entities().find((ent) => ent.type === 'bot_command')

    if (!hasCommand && ctx.session.translate.enable) {
      await this.onTranslate(ctx)
      return
    }

    refundCallback('Unsupported command')
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
    ctx.session.analytics.actualResponseTime = process.hrtime.bigint()
    ctx.session.analytics.sessionState = SessionState.Success
  }

  public async stopTranslate (ctx: OnMessageContext): Promise<void> {
    ctx.chatAction = 'typing'
    ctx.session.translate.enable = false
    await ctx.reply('Translation is disabled', { message_thread_id: ctx.message?.message_thread_id })
    ctx.session.analytics.actualResponseTime = process.hrtime.bigint()
    ctx.session.analytics.sessionState = SessionState.Success
  }

  public async onTranslate (ctx: OnMessageContext): Promise<void> {
    const message = ctx.message.text

    const progressMessage = await ctx.reply('...', { message_thread_id: ctx.message?.message_thread_id })
    ctx.session.analytics.firstResponseTime = process.hrtime.bigint()
    ctx.chatAction = 'typing'

    if (!message) {
      ctx.session.analytics.actualResponseTime = process.hrtime.bigint()
      ctx.session.analytics.sessionState = SessionState.Success
      return
    }

    const conversation0 = [
      {
        role: 'system',
        content: 'You will be provided with a sentence, and your task is detect original language.' +
          'Use language codes for response.' +
          "If you can't detect language use word 'unknown' for response." +
          'When prompted, only respond with the translation, no explanation, or additional text ever.' +
          'Also, if multiple translations are prompted, split each one with an empty line.'
      },
      { role: 'user', content: message }
    ]

    const completion01 = await chatCompletion(conversation0)
    const originalLangCode = completion01.completion

    // can't detect original language
    if (completion01.completion === 'unknown') {
      await ctx.api.deleteMessage(ctx.chat.id, progressMessage.message_id)
      ctx.session.analytics.actualResponseTime = process.hrtime.bigint()
      ctx.session.analytics.sessionState = SessionState.Success
      return
    }

    // translation not required.
    if (ctx.session.translate.languages.includes(originalLangCode)) {
      await ctx.api.deleteMessage(ctx.chat.id, progressMessage.message_id)
      ctx.session.analytics.actualResponseTime = process.hrtime.bigint()
      ctx.session.analytics.sessionState = SessionState.Success
      return
    }

    const targetLanguages = ctx.session.translate.languages.join(', ')

    const conversation = [
      { role: 'system', content: `You will be provided with a sentence in ${originalLangCode}, and your task is to translate it into ${targetLanguages}.` },
      { role: 'user', content: message }
    ]

    const response = await chatCompletion(conversation)

    await ctx.api.editMessageText(ctx.chat.id, progressMessage.message_id, response.completion, { parse_mode: 'Markdown' })

    ctx.session.analytics.actualResponseTime = process.hrtime.bigint()
    ctx.session.analytics.sessionState = SessionState.Success
  }
}
