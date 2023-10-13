import fs from 'fs'
import pino from 'pino'
import { InputFile } from 'grammy'
import type { Logger } from 'pino'
import type { BotPayments } from '../payment'
import { chatCompletion, speechToText } from '../open-ai/api/openAi'
import type { OnMessageContext, PayableBot } from '../types'
import config from '../../config'
import { ChatGPTModelsEnum } from '../open-ai/types'
import { ElevenlabsClient } from '../../elevenlabs/elevenlabsClient'

export class VoiceToVoiceGPTBot implements PayableBot {
  private readonly payments: BotPayments

  private readonly logger: Logger

  constructor (payments: BotPayments) {
    this.payments = payments
    this.logger = pino({
      name: 'VoiceToVoiceGPT',
      transport: {
        target: 'pino-pretty',
        options: { colorize: true }
      }
    })
  }

  public isSupportedEvent (ctx: OnMessageContext): boolean {
    const { voice, audio } = ctx.update.message
    return (!!voice || !!audio)
  }

  public getEstimatedPrice (ctx: OnMessageContext): number {
    const { voice, audio } = ctx.update.message
    const seconds = (voice?.duration ?? audio?.duration) ?? 0
    return seconds * 0.005
  }

  public async onEvent (ctx: OnMessageContext): Promise<void> {
    const { voice, audio } = ctx.update.message

    if (!(!!voice || !!audio)) {
      return
    }

    const progressMessage = await ctx.reply('Generating...')

    if (!ctx.chat?.id) {
      throw Error('chat id is undefined')
    }

    const file = await ctx.getFile()
    const path = await file.download()

    let ext = 'ogg'

    if (file.file_path) {
      ext = file.file_path.split('.').pop() ?? ext
    }

    const filename = path + '.' + ext
    fs.renameSync(path, filename)

    const resultText = await speechToText(fs.createReadStream(filename))
    fs.rmSync(filename)

    const conversation = [{ role: 'user', content: resultText }]
    const response = await chatCompletion(conversation, ChatGPTModelsEnum.GPT_35_TURBO_16K)

    const elevenlabsClient = new ElevenlabsClient(config.elevenlabs.apiKey)

    const voiceResult = await elevenlabsClient.textToSpeech({ text: response.completion, voiceId: '21m00Tcm4TlvDq8ikWAM' })
    // const voiceResult = await gcTextToSpeedClient.ssmlTextToSpeech({ text: response.completion, ssmlGender: 'MALE', languageCode: 'en-US' })

    if (!voiceResult) {
      await ctx.reply('voice generation error')
      return
    }

    await ctx.api.deleteMessage(ctx.chat.id, progressMessage.message_id)

    const inputFile = new InputFile(voiceResult)

    await ctx.replyWithVoice(inputFile)
  }
}