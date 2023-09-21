import { type OnMessageContext, type PayableBot, type RefundCallback, SessionState } from '../types'
import pino, { type Logger } from 'pino'
import { getChatModel, getChatModelPrice, getTokenNumber } from '../open-ai/api/openAi'
import config from '../../config'
import { mapToTargetLang, translator } from './deeplClient'

enum SupportedCommands {
  Translate = 'translate',
  TranslateStop = 'translatestop'
}

const SupportedLangCommands = ['bg', 'cs', 'da', 'de', 'el', 'es', 'et', 'fi', 'fr', 'hu', 'id', 'it', 'ja', 'ko', 'lt', 'lv', 'nb', 'nl', 'pl', 'ro', 'ru', 'sk', 'sl', 'sv', 'tr', 'uk', 'zh', 'en', 'pt']

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

    const hasCommand = this.isCtxHasAnyCommand(ctx)

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

  public isCtxHasAnyCommand (ctx: OnMessageContext): boolean {
    const command = ctx.entities().find((ent) => ent.type === 'bot_command')
    return !!command
  }

  public isSupportedEvent (ctx: OnMessageContext): boolean {
    // /translate
    if (ctx.hasCommand(Object.values(SupportedCommands))) {
      return true
    }

    const hasShortcut = this.isCtxHasLangShortcut(ctx)
    const hasLangCommand = this.isCtxHasLangCommand(ctx)

    // en. de. ru. ||  /en /de /ru
    if (hasShortcut || hasLangCommand) {
      return true
    }

    // Plain text and enabled translation
    const isPlainText = !this.isCtxHasAnyCommand(ctx)
    return !!(isPlainText && ctx.session.translate.enable)
  }

  public isCtxHasLangCommand (ctx: OnMessageContext): boolean {
    return ctx.hasCommand(SupportedLangCommands)
  }

  public isCtxHasLangShortcut (ctx: OnMessageContext): boolean {
    const message = ctx.message.text

    if (!message) {
      return false
    }

    for (const supportedShortCut of SupportedLangCommands) {
      if (message.toLowerCase().startsWith(supportedShortCut + '.')) {
        return true
      }
    }

    return false
  }

  public async onEvent (ctx: OnMessageContext, refundCallback: RefundCallback): Promise<void> {
    ctx.session.analytics.module = this.module
    if (!this.isSupportedEvent(ctx)) {
      await ctx.reply(`Unsupported command: ${ctx.message?.text}`, { message_thread_id: ctx.message?.message_thread_id })
      ctx.session.analytics.actualResponseTime = performance.now()
      ctx.session.analytics.sessionState = SessionState.Error
      refundCallback('Unsupported command')
      return
    }

    if (!ctx.message.text) {
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

    if (this.isCtxHasLangCommand(ctx)) {
      const command = ctx.entities().find(item => item.type === 'bot_command' && item.offset === 0)
      if (!command) {
        await ctx.reply('Unexpected error')
        return
      }

      const langCode = command?.text.replace('/', '') ?? null
      console.log('### langCode', langCode)

      const message = ctx.message.text.slice(command.text.length + 1, ctx.message.text.length).trim()
      await this.onTranslateShortcut(ctx, message, langCode)
      return
    }

    if (this.isCtxHasLangShortcut(ctx)) {
      const langCode = ctx.message.text.split('.')[0] || null

      if (!langCode) {
        await ctx.reply('Unexpected error')
        return
      }

      const message = ctx.message.text.slice(langCode.length + 1, ctx.message.text.length).trim()
      await this.onTranslateShortcut(ctx, message, langCode)
      return
    }

    const isPlainText = !this.isCtxHasAnyCommand(ctx)

    if (isPlainText && ctx.session.translate.enable) {
      await this.onTranslatePlainText(ctx)
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
    ctx.session.analytics.actualResponseTime = performance.now()
    ctx.session.analytics.sessionState = SessionState.Success
  }

  public async stopTranslate (ctx: OnMessageContext): Promise<void> {
    ctx.chatAction = 'typing'
    ctx.session.translate.enable = false
    await ctx.reply('Translation is disabled', { message_thread_id: ctx.message?.message_thread_id })
    ctx.session.analytics.actualResponseTime = performance.now()
    ctx.session.analytics.sessionState = SessionState.Success
  }

  public async onTranslateShortcut (ctx: OnMessageContext, message: string, targetLangCode: string): Promise<void> {
    const targetLanguage = mapToTargetLang(targetLangCode)

    if (targetLanguage === null) {
      await ctx.reply(`Unsupported language: ${targetLangCode}`)
      return
    }

    const result = await translator.translateText(message, null, targetLanguage)

    if (!result.text) {
      await ctx.reply('Unexpected error')
      return
    }

    await ctx.reply(result.text)
  }

  public async onTranslatePlainText (ctx: OnMessageContext): Promise<void> {
    const message = ctx.message.text

    const progressMessage = await ctx.reply('...', { message_thread_id: ctx.message?.message_thread_id })
    ctx.session.analytics.firstResponseTime = performance.now()
    ctx.chatAction = 'typing'

    if (!message) {
      ctx.session.analytics.actualResponseTime = performance.now()
      ctx.session.analytics.sessionState = SessionState.Success
      return
    }

    const targetLanguages = ctx.session.translate.languages

    const translateResults: string[] = []
    for (const targetLangCode of targetLanguages) {
      const targetLanguage = mapToTargetLang(targetLangCode)

      if (targetLanguage === null) {
        translateResults.push(`Unsupported language: ${targetLangCode}`)
        continue
      }

      const result = await translator.translateText(message, null, targetLanguage)
      if (result.detectedSourceLang !== targetLangCode) {
        translateResults.push(result.text)
      }
    }

    if (translateResults.length === 0) {
      await ctx.api.deleteMessage(ctx.chat.id, progressMessage.message_id)
      ctx.session.analytics.actualResponseTime = performance.now()
      ctx.session.analytics.sessionState = SessionState.Success
      return
    }

    const responseMessage = translateResults.join('\n\n')

    await ctx.api.editMessageText(ctx.chat.id, progressMessage.message_id, responseMessage, { parse_mode: 'Markdown' })

    ctx.session.analytics.actualResponseTime = performance.now()
    ctx.session.analytics.sessionState = SessionState.Success
  }
}
