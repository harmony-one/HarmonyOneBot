import fs from 'fs'
import pino from 'pino'
import type { Logger } from 'pino'
import { speechToText } from '../open-ai/api/openAi'
import type { OnMessageContext, PayableBot } from '../types'
import { download } from '../../utils/files'
import config from '../../config'
import { type OpenAIBot } from '../open-ai'
import { SupportedCommands as OpenAISupportedCommands } from '../open-ai/helpers'

const VOICE_COMMAND_LIST = [OpenAISupportedCommands.vision, OpenAISupportedCommands.ask]
export class VoiceCommand implements PayableBot {
  public readonly module = 'VoiceCommand'
  private readonly logger: Logger
  private readonly openAIBot: OpenAIBot

  constructor (openAIBot: OpenAIBot) {
    this.logger = pino({
      name: 'VoiceCommand',
      transport: {
        target: 'pino-pretty',
        options: { colorize: true }
      }
    })
    this.openAIBot = openAIBot
  }

  public isSupportedEvent (ctx: OnMessageContext): boolean {
    const { voice } = ctx.update.message
    return !!voice && voice.mime_type === 'audio/ogg' && voice.duration < config.voiceCommand.voiceDuration && !!voice.file_id
  }

  public getEstimatedPrice (ctx: OnMessageContext): number {
    return 0
  }

  getCommand (transcribedText: string): string {
    const prefixList = VOICE_COMMAND_LIST
    for (let i = 0; i < prefixList.length; i++) {
      if (transcribedText.toLocaleLowerCase().startsWith(prefixList[i])) {
        return prefixList[i]
      }
    }
    return ''
  }

  getRandomEmoji (): string {
    const emojis = ['👌', '🖖', '🤙', '👇']
    const randomIndex = Math.floor(Math.random() * emojis.length)
    return emojis[randomIndex]
  }

  public async onEvent (ctx: OnMessageContext): Promise<void> {
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

    console.log('VoiceCommand prompt detected', resultText)

    fs.rmSync(filename)
    const command = this.getCommand(resultText)

    if (command) {
      await ctx.api.editMessageText(ctx.chat.id, progressMessage.message_id, this.getRandomEmoji(), { parse_mode: 'Markdown' })
      await this.openAIBot.voiceCommand(ctx, command, resultText)
      await ctx.api.deleteMessage(ctx.chat.id, progressMessage.message_id)
    } else {
      await ctx.api.editMessageText(ctx.chat.id, progressMessage.message_id, `No command detected. This is what I heard 😉: _${resultText}_`, { parse_mode: 'Markdown' })
    }
  }
}
