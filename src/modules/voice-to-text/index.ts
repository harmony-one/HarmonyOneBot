import fs from 'fs'
import pino from 'pino'
import { InputFile } from 'grammy'
import type { Logger } from 'pino'
import type { BotPayments } from '../payment'
import { speechToText } from '../open-ai/api/openAi'
import type { OnMessageContext, PayableBot } from '../types'
import { bot } from '../../bot'
import { RequestState } from '../types'
import { download } from '../../utils/files'

export class VoiceToTextBot implements PayableBot {
  public readonly module = 'VoiceToText'
  private readonly payments: BotPayments

  private readonly logger: Logger

  constructor (payments: BotPayments) {
    this.payments = payments
    this.logger = pino({
      name: 'VoiceToText',
      transport: {
        target: 'pino-pretty',
        options: { colorize: true }
      }
    })
  }

  public isSupportedEvent (ctx: OnMessageContext): boolean {
    return ctx.hasCommand('text')
  }

  public getEstimatedPrice (ctx: OnMessageContext): number {
    const { voice, audio } = ctx.update.message
    const seconds = (voice?.duration ?? audio?.duration) ?? 0
    return seconds * 0.005
  }

  public async onEvent (ctx: OnMessageContext): Promise<void> {
    ctx.transient.analytics.module = this.module
    const { voice, audio } = ctx.message.reply_to_message ?? { voice: undefined, audio: undefined }

    if (!voice && !audio) {
      await ctx.reply('The message must include audio content')
      return
    }

    const progressMessage = await ctx.reply('Generating...')

    if (!ctx.chat?.id) {
      throw Error('chat id is undefined')
    }

    const fileId = voice?.file_id ?? audio?.file_id

    if (!fileId) {
      await ctx.reply('The message must include audio content')
      return
    }

    const file = await bot.api.getFile(fileId)

    const path = await download(file)

    let ext = 'ogg'

    if (file.file_path) {
      ext = file.file_path.split('.').pop() ?? ext
    }

    const filename = path + '.' + ext
    fs.renameSync(path, filename)
    const resultText = await speechToText(fs.createReadStream(filename))
    fs.rmSync(filename)

    await ctx.api.deleteMessage(ctx.chat.id, progressMessage.message_id)
    if (resultText.length > 512) {
      const translationFile = new InputFile(new TextEncoder().encode(resultText), `From @${ctx.message.from.username}.txt`)
      await bot.api.sendDocument(ctx.chat.id, translationFile, {
        reply_to_message_id: ctx.message.message_id,
        caption: resultText.slice(0, 1024)
      })
    } else {
      await ctx.reply(resultText, { message_thread_id: ctx.message?.message_thread_id })
    }

    ctx.transient.analytics.sessionState = RequestState.Success
  }
}
