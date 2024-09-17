import fs from 'fs'
import pino from 'pino'
import type { Logger } from 'pino'
import { speechToText } from '../llms/api/openai'
import {
  RequestState,
  type OnMessageContext,
  type PayableBot
} from '../types'
import { download } from '../../utils/files'
import config from '../../config'
import { type OpenAIBot } from '../llms'
import {
  sendMessage,
  SupportedCommands as OpenAISupportedCommands
} from '../llms/utils/helpers'
import { promptHasBadWords } from '../sd-images/helpers'
import { now } from '../../utils/perf'
import {
  LlmCommandsEnum,
  LlmModelsEnum
} from '../llms/utils/llmModelsManager'

export class VoiceCommand implements PayableBot {
  private readonly voiceCommandList: string[]
  protected modelsEnum = LlmModelsEnum
  protected commandsEnum = LlmCommandsEnum
  public readonly module = 'VoiceCommand'
  private readonly logger: Logger
  private readonly openAIBot: OpenAIBot
  private lastCommand: string = ''

  constructor (openAIBot: OpenAIBot) {
    this.logger = pino({
      name: 'VoiceCommand',
      transport: {
        target: 'pino-pretty',
        options: { colorize: true }
      }
    })
    this.voiceCommandList = [
      this.commandsEnum.VISION,
      this.commandsEnum.ASK,
      this.commandsEnum.DALLE,
      OpenAISupportedCommands.talk
    ]
    this.openAIBot = openAIBot
  }

  public isSupportedEvent (ctx: OnMessageContext): boolean {
    const { voice } = ctx.update.message
    const isSupported = !!voice && voice.mime_type === 'audio/ogg' && voice.duration < config.voiceCommand.voiceDuration && !!voice.file_id
    if (!isSupported) {
      this.lastCommand = '' // user is using other command. Is not reusing the same voice command.
    }
    return isSupported
  }

  public getEstimatedPrice (ctx: OnMessageContext): number {
    const { voice } = ctx.update.message
    const seconds = voice?.duration ?? 0
    return seconds * 0.005
  }

  getCommand (transcribedText: string): string {
    for (let i = 0; i < this.voiceCommandList.length; i++) {
      if (transcribedText.toLocaleLowerCase().startsWith(this.voiceCommandList[i])) {
        return this.voiceCommandList[i]
      }
    }
    return ''
  }

  getRandomEmoji (): string {
    const emojis = ['👌', '🖖', '🤙', '👇']
    const randomIndex = Math.floor(Math.random() * emojis.length)
    return emojis[randomIndex]
  }

  public async onEvent (
    ctx: OnMessageContext,
    refundCallback: (reason?: string) => void
  ): Promise<void> {
    ctx.transient.analytics.module = this.module
    const { voice } = ctx.update.message
    if (!ctx.chat?.id) {
      throw Error('chat id is undefined')
    }

    const fileId = voice?.file_id
    if (!fileId) {
      await ctx.reply('The message must include audio content')
      return
    }
    const progressMessage = await ctx.reply('Listening...')

    const file = await ctx.api.getFile(fileId)

    const path = await download(file)

    let ext = 'ogg'

    if (file.file_path) {
      ext = file.file_path.split('.').pop() ?? ext
    }
    const filename = path + '.' + ext
    fs.renameSync(path, filename)
    const resultText = await speechToText(fs.createReadStream(filename))
    if (promptHasBadWords(resultText)) {
      console.log(`### promptHasBadWords ${ctx.message?.text}`)
      await sendMessage(
        ctx,
        'Your prompt has been flagged for potentially generating illegal or malicious content. If you believe there has been a mistake, please reach out to support.'
      )
      ctx.transient.analytics.sessionState = RequestState.Error
      ctx.transient.analytics.actualResponseTime = now()
      refundCallback('Prompt has bad words')
      return
    }
    this.logger.info(`[VoiceCommand] prompt detected: ${resultText}`)

    fs.rmSync(filename)
    const command = this.getCommand(resultText) || this.lastCommand

    if (command) {
      this.lastCommand = command
      await ctx.api.editMessageText(ctx.chat.id, progressMessage.message_id, this.getRandomEmoji(), { parse_mode: 'Markdown' })
      // await this.openAIBot.voiceCommand(ctx, command, resultText)
      await ctx.api.deleteMessage(ctx.chat.id, progressMessage.message_id)
    } else {
      await ctx.api.editMessageText(ctx.chat.id, progressMessage.message_id, `No command detected. This is what I heard: _${resultText}_`, { parse_mode: 'Markdown' })
    }
  }
}
