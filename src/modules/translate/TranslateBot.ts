import { type OnMessageContext, type PayableBot, type RefundCallback, RequestState } from '../types'
import pino, { type Logger } from 'pino'
import { now } from '../../utils/perf'
import { gcTranslateClient } from '../../google-cloud/gcTranslateClient'

enum SupportedCommands {
  Translate = 'translate',
  TranslateStop = 'translatestop'
}

// const SupportedLangCommands = ['bg', 'cs', 'da', 'de', 'el', 'es', 'et', 'fi', 'fr', 'hu', 'id', 'it', 'ja', 'ko', 'lt', 'lv', 'nb', 'nl', 'pl', 'ro', 'ru', 'sk', 'sl', 'sv', 'tr', 'uk', 'zh', 'en', 'pt']
const SupportedLangCommands = ['af', 'sq', 'ar', 'hy', 'as', 'ay', 'az', 'bm', 'eu', 'bn', 'bho', 'bs', 'bg', 'ca', 'ceb',
  'zh', 'zh-TW', 'co', 'cs', 'da', 'dv', 'doi', 'nl', 'en', 'eo', 'et', 'ee', 'tl', 'fi', 'fr', 'fy', 'gl', 'lg', 'ka',
  'de', 'el', 'gn', 'gu', 'ht', 'haw', 'iw', 'hi', 'hr', 'hmn', 'hu', 'is', 'ig', 'ilo', 'id', 'ga', 'it', 'ja', 'jw', 'kn',
  'kk', 'km', 'rw', 'gom', 'ko', 'kri', 'ku', 'ckb', 'ky', 'lo', 'la', 'lv', 'ln', 'lt', 'lb', 'mk', 'mai', 'mg', 'ms',
  'ml', 'mt', 'mi', 'mr', 'mni-Mtei', 'lus', 'mn', 'my', 'ne', 'nso', 'or', 'om', 'ps', 'fa', 'pl', 'pt', 'pa', 'qu', 'ro',
  'ru', 'sm', 'sa', 'gd', 'sr', 'st', 'sn', 'sd', 'si', 'sk', 'sl', 'so', 'es', 'su', 'sw', 'sv', 'tg', 'ta', 'tt', 'te',
  'th', 'ti', 'ts', 'tr', 'tk', 'ak', 'uk', 'ur', 'ug', 'uz', 'vi', 'cy', 'xh', 'yi', 'yo', 'zu', 'he', 'jv', 'zh-CN']
// SupportedLangCommands.concat(['am', 'be', 'ny', 'ha', 'no']) removed to avoid common words in prefix

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
    const text = ctx.message.reply_to_message?.text ?? ctx.message.text ?? ''
    const len = text.length
    return len * 0.00005
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
    ctx.transient.analytics.module = this.module
    if (!this.isSupportedEvent(ctx)) {
      await ctx.reply(`Unsupported command: ${ctx.message?.text}`, { message_thread_id: ctx.message?.message_thread_id })
      ctx.transient.analytics.actualResponseTime = now()
      ctx.transient.analytics.sessionState = RequestState.Error
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

      const langCode = command.text.replace('/', '') ?? null

      // Reply message text takes priority
      const message = ctx.message.reply_to_message?.text ?? ctx.message.text.slice(command.text.length, ctx.message.text.length).trim()
      await this.translateMessage(ctx, message, langCode)
      return
    }

    if (this.isCtxHasLangShortcut(ctx)) {
      const langCode = ctx.message.text.split('.')[0] || null

      if (!langCode) {
        await ctx.reply('Unexpected error')
        return
      }

      const message = ctx.message.reply_to_message?.text ?? ctx.message.text.slice(langCode.length + 1, ctx.message.text.length).trim()
      await this.translateMessage(ctx, message, langCode)
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
    ctx.transient.analytics.actualResponseTime = now()
    ctx.transient.analytics.sessionState = RequestState.Success
  }

  public async stopTranslate (ctx: OnMessageContext): Promise<void> {
    ctx.chatAction = 'typing'
    ctx.session.translate.enable = false
    await ctx.reply('Translation is disabled', { message_thread_id: ctx.message?.message_thread_id })
    ctx.transient.analytics.actualResponseTime = now()
    ctx.transient.analytics.sessionState = RequestState.Success
  }

  public async translateMessage (ctx: OnMessageContext, message: string, targetLangCode: string): Promise<void> {
    const result = await gcTranslateClient.translate(message, targetLangCode)

    if (!result) {
      await ctx.reply('Unexpected error')
      return
    }

    await ctx.reply(result)
  }

  public async onTranslatePlainText (ctx: OnMessageContext): Promise<void> {
    const message = ctx.message.text

    const progressMessage = await ctx.reply('...', { message_thread_id: ctx.message?.message_thread_id })
    ctx.transient.analytics.firstResponseTime = now()
    ctx.chatAction = 'typing'

    if (!message) {
      ctx.transient.analytics.actualResponseTime = now()
      ctx.transient.analytics.sessionState = RequestState.Success
      return
    }

    const targetLanguages = ctx.session.translate.languages

    const translateResults: string[] = []
    for (const targetLangCode of targetLanguages) {
      const result = await gcTranslateClient.translate(message, targetLangCode)
      translateResults.push(result)
    }

    if (translateResults.length === 0) {
      await ctx.api.deleteMessage(ctx.chat.id, progressMessage.message_id)
      ctx.transient.analytics.actualResponseTime = now()
      ctx.transient.analytics.sessionState = RequestState.Success
      return
    }

    const responseMessage = translateResults.join('\n\n')

    await ctx.api.editMessageText(ctx.chat.id, progressMessage.message_id, responseMessage, { parse_mode: 'Markdown' })

    ctx.transient.analytics.actualResponseTime = now()
    ctx.transient.analytics.sessionState = RequestState.Success
  }
}
