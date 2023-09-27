import pino from 'pino'
import { InputFile } from 'grammy'
import type { Logger } from 'pino'
import type { BotPayments } from '../payment'
import type { OnMessageContext, PayableBot } from '../types'
import { gcTextToSpeedClient } from '../../google-cloud/gcTextToSpeechClient'

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
    return ctx.hasCommand('voice')
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
    if (ctx.hasCommand('voice')) {
      const text = this.getTextFromMessage(ctx)
      await this.onTextToSpeech(ctx, text)
    }
  }

  public async onTextToSpeech (ctx: OnMessageContext, message: string): Promise<void> {
    if (!message) {
      await ctx.reply('/voice command should contain text.')
      return
    }

    if (!ctx.chat?.id) {
      throw new Error('Internal error')
    }

    const progressMessage = await ctx.reply('Generating...')

    const voiceResult = await gcTextToSpeedClient.textToSpeech(message)

    if (!voiceResult) {
      await ctx.api.editMessageText(ctx.chat.id, progressMessage.message_id, 'An error occurred during the process of generating the message.')
      return
    }

    const inputFile = new InputFile(voiceResult)

    await ctx.api.deleteMessage(ctx.chat.id, progressMessage.message_id)
    await ctx.replyWithVoice(inputFile)
  }
}
