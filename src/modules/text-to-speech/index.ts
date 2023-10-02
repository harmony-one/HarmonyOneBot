import pino from 'pino'
import { InputFile } from 'grammy'
import type { Logger } from 'pino'
import type { BotPayments } from '../payment'
import type { OnMessageContext, PayableBot } from '../types'
import { gcTextToSpeedClient, type TextToSpeechParams } from '../../google-cloud/gcTextToSpeechClient'

enum SupportedCommands {
  VOICE = 'voice',
  VOICEHK = 'voicehk',
  VOICEHKF = 'voicehkf',
  VOICERU = 'voiceru',
  VOICECN = 'voicecn',
  VOICEES = 'voicees'

}

export class TextToSpeechBot implements PayableBot {
  private readonly payments: BotPayments

  private readonly logger: Logger

  constructor (payments: BotPayments) {
    this.payments = payments
    this.logger = pino({
      name: 'TextToSpeech',
      transport: {
        target: 'pino-pretty',
        options: { colorize: true }
      }
    })
  }

  public isSupportedEvent (ctx: OnMessageContext): boolean {
    return ctx.hasCommand(Object.values(SupportedCommands))
  }

  public getEstimatedPrice (ctx: OnMessageContext): number {
    const str = this.getTextFromMessage(ctx)
    return str.length * 0.005
  }

  public getTextFromMessage (ctx: OnMessageContext): string {
    if (ctx.match?.toString()) {
      return ctx.match.toString()
    }

    return ctx.message.reply_to_message?.text ?? ''
  }

  public async onEvent (ctx: OnMessageContext): Promise<void> {
    if (ctx.hasCommand(SupportedCommands.VOICE)) {
      const text = this.getTextFromMessage(ctx)
      await this.onTextToSpeech(ctx, { text, gender: 'MALE', languageCode: 'en-US' })
      return
    }

    if (ctx.hasCommand(SupportedCommands.VOICEHK)) {
      const text = this.getTextFromMessage(ctx)
      await this.onTextToSpeech(ctx, { text, gender: 'MALE', languageCode: 'yue-Hant-HK' })
      return
    }

    if (ctx.hasCommand(SupportedCommands.VOICEHKF)) {
      const text = this.getTextFromMessage(ctx)
      await this.onTextToSpeech(ctx, { text, gender: 'FEMALE', languageCode: 'yue-Hant-HK' })
      return
    }

    if (ctx.hasCommand(SupportedCommands.VOICERU)) {
      const text = this.getTextFromMessage(ctx)
      await this.onTextToSpeech(ctx, { text, gender: 'FEMALE', languageCode: 'ru-RU' })
    }

    if (ctx.hasCommand(SupportedCommands.VOICERU)) {
      const text = this.getTextFromMessage(ctx)
      await this.onTextToSpeech(ctx, { text, gender: 'FEMALE', languageCode: 'ru-RU' })
    }

    if (ctx.hasCommand(SupportedCommands.VOICECN)) {
      const text = this.getTextFromMessage(ctx)
      await this.onTextToSpeech(ctx, { text, gender: 'MALE', languageCode: 'cmn-CN' })
    }

    if (ctx.hasCommand(SupportedCommands.VOICEES)) {
      const text = this.getTextFromMessage(ctx)
      await this.onTextToSpeech(ctx, { text, gender: 'MALE', languageCode: 'es-ES' })
    }
  }

  public async onTextToSpeech (ctx: OnMessageContext, params: TextToSpeechParams): Promise<void> {
    const { text, gender, languageCode } = params

    if (!params.text) {
      await ctx.reply('/voice command should contain text.')
      return
    }

    if (!ctx.chat?.id) {
      throw new Error('Internal error')
    }

    const progressMessage = await ctx.reply('Generating...')

    const voiceResult = await gcTextToSpeedClient.textToSpeech({ text, gender, languageCode })

    if (!voiceResult) {
      await ctx.api.editMessageText(ctx.chat.id, progressMessage.message_id, 'An error occurred during the process of generating the message.')
      return
    }

    const inputFile = new InputFile(voiceResult)

    await ctx.api.deleteMessage(ctx.chat.id, progressMessage.message_id)
    await ctx.replyWithVoice(inputFile)
  }
}
