import { type OnMessageContext, type PayableBot, RequestState } from '../types'
import pino, { type Logger } from 'pino'
import { initTelegramClient } from './MTProtoAPI'
import { NewMessage, type NewMessageEvent } from 'telegram/events'
import { LRUCache } from 'lru-cache'
import { Api, type TelegramClient } from 'telegram'
import { Speechmatics } from './speechmatics'
import config from '../../config'
import { type Buffer } from 'buffer'
import fs from 'fs'
import { Kagi } from './kagi'
import MessageMediaDocument = Api.MessageMediaDocument
import { InputFile } from 'grammy'
import { bot } from '../../bot'
import * as Sentry from '@sentry/node'
import { now } from '../../utils/perf'
import { isAdmin } from '../llms/utils/context'
import { VOICE_MEMO_FORWARDING } from '../../constants'

interface TranslationJob {
  filePath: string
  publicFileUrl: string
}

enum SupportedCommands {
  FORWARD = 'forward'
}

export class VoiceMemo implements PayableBot {
  public readonly module = 'VoiceMemo'
  private readonly logger: Logger
  private readonly tempDirectory = 'public'
  private telegramClient?: TelegramClient
  private readonly speechmatics = new Speechmatics(config.voiceMemo.speechmaticsApiKey)
  private readonly kagi = new Kagi(config.voiceMemo.kagiApiKey)
  private readonly requestsQueue = new LRUCache({ max: 100, ttl: 1000 * 60 * 5 })
  private readonly jobsQueue = new LRUCache<string, TranslationJob>({ max: 100, ttl: 1000 * 60 * 5 })

  constructor () {
    this.logger = pino({
      name: 'VoiceMemo',
      transport: {
        target: 'pino-pretty',
        options: { colorize: true }
      }
    })
    if (config.voiceMemo.isEnabled) {
      this.initTgClient().catch((ex) => {
        Sentry.captureException(ex)
        this.logger.error(`Error initTgClient ${ex}`)
      })
    } else {
      this.logger.warn('Voice-memo disabled in config')
    }
  }

  private getTempFilePath (filename: string): string {
    return `./${this.tempDirectory}/${filename}`
  }

  private writeTempFile (buffer: string | Buffer, filename: string): string {
    const filePath = this.getTempFilePath(filename)
    const dirPath = `./${this.tempDirectory}`
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath)
    }
    fs.writeFileSync(filePath, buffer)
    return filePath
  }

  private deleteTempFile (filePath: string): void {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  }

  private readonly sleep = async (timeout: number): Promise<void> => { await new Promise(resolve => setTimeout(resolve, timeout)) }

  private async initTgClient (): Promise<void> {
    this.telegramClient = await initTelegramClient()
    this.telegramClient.addEventHandler((event) => {
      this.onTelegramClientEvent(event).catch((e) => {
        this.logger.error(`Telegram event error: ${(e as Error).message}}`)
      })
    }, new NewMessage({}))
    this.logger.info('VoiceMemo bot started')
  }

  private async downloadAudioFile (media: MessageMediaDocument): Promise< { filePath: string, publicFileUrl: string } | undefined> {
    const buffer = await this.telegramClient?.downloadMedia(media)
    if (buffer && media.document) {
      const fileName = `${media.document.id.toString()}.ogg`
      const filePath = this.writeTempFile(buffer, fileName)
      const publicFileUrl = `${config.voiceMemo.servicePublicUrl}/${fileName}`
      return {
        filePath,
        publicFileUrl
      }
    }
  }

  private async onTelegramClientEvent (event: NewMessageEvent): Promise<void> {
    const { media, chatId, senderId } = event.message
    if (chatId && media instanceof Api.MessageMediaDocument && media?.document) {
      // @ts-expect-error TS2339: Property 'size' does not exist on type 'TypeDocument'.
      const { size } = media.document
      const requestKey = `${senderId}_${size.toString()}`
      this.logger.info(`Request from ${senderId}: request key: ${requestKey}`)

      for (let i = 0; i < 500; i++) {
        if (this.requestsQueue.get(requestKey)) {
          this.logger.info(`Request ${requestKey} found in queue, start downloading audio file...`)
          const result = await this.downloadAudioFile(media)
          if (result) {
            this.logger.info(`Request ${requestKey} file downloaded`)
            this.jobsQueue.set(requestKey, result)
          }
          return
        }
        await this.sleep(100)
      }
      this.logger.info(`Event ${requestKey} not found in queue, skip`)
    }
  }

  private enrichSummarization (text: string): string {
    text = text.replace('The speakers', 'We')
    const splitText = text.split('.').map(part => part.trim())
    let resultText = ''
    for (let i = 0; i < splitText.length; i++) {
      if (i % 2 !== 0) {
        continue
      }
      const sentence1 = splitText[i]
      const sentence2 = splitText[i + 1] || ''
      const twoSentences = sentence1 + (sentence2 ? '. ' + sentence2 + '.' : '')
      resultText += twoSentences
      if (i < splitText.length - 3) {
        resultText += '\n\n'
      }
    }
    if (!resultText.endsWith('.')) {
      resultText += '.'
    }
    return resultText
  }

  public isSupportedEvent (ctx: OnMessageContext): boolean {
    const { voice, audio } = ctx.update.message
    return ctx.hasCommand(Object.values(SupportedCommands)) || config.voiceMemo.isEnabled && (!!voice || !!audio)
  }

  public getEstimatedPrice (ctx: OnMessageContext): number {
    const { update: { message: { voice } } } = ctx
    if (voice) {
      return this.speechmatics.estimatePrice(voice.duration)
    }
    return 0
  }

  public async onEvent (ctx: OnMessageContext): Promise<void> {
    ctx.transient.analytics.module = this.module
    const { voice, audio, from } = ctx.update.message
    const fileSize = (voice ?? audio)?.file_size
    const requestKey = `${from.id}_${fileSize}`

    if (ctx.hasCommand(SupportedCommands.FORWARD)) {
      if (await isAdmin(ctx)) {
        ctx.session.voiceMemo.isOneTimeForwardingVoiceEnabled = true
        this.logger.info('/forward command')
        await ctx.reply(VOICE_MEMO_FORWARDING.enabled, {
          link_preview_options: { is_disabled: true },
          message_thread_id: ctx.message?.message_thread_id
        })
        return
      }
      await ctx.reply(VOICE_MEMO_FORWARDING.restricted, {
        link_preview_options: { is_disabled: true },
        message_thread_id: ctx.message?.message_thread_id
      })
      return
    }

    this.requestsQueue.set(requestKey, Date.now())

    this.logger.info(`onEvent message @${from.username} (${from.id}): ${requestKey}`)

    if (ctx.session.voiceMemo.isOneTimeForwardingVoiceEnabled) {
      ctx.session.voiceMemo.isOneTimeForwardingVoiceEnabled = false
    }

    let translationJob

    for (let i = 0; i < 30 * 60; i++) {
      translationJob = this.jobsQueue.get(requestKey)
      if (translationJob) {
        break
      }
      await this.sleep(1000)
    }

    if (translationJob) {
      const { filePath, publicFileUrl } = translationJob
      this.logger.info(`Public file url: ${publicFileUrl}`)
      try {
        const [translation, kagiResult] = await Promise.allSettled([
          this.speechmatics.getTranslation(filePath),
          this.kagi.getSummarization(publicFileUrl)
        ])

        // this.logger.info(`Kagi summarization: ${JSON.stringify(kagiResult)}`)
        this.logger.info(`Translation ready: ${JSON.stringify(translation)}`)

        if (translation && translation.status === 'fulfilled' && translation.value) {
          let summary = kagiResult.status === 'fulfilled'
            ? kagiResult.value
            : translation.value.summarization
          if (summary) {
            summary = this.enrichSummarization(summary)
          }
          if (kagiResult.status !== 'fulfilled' && summary) {
            summary = `${summary}` // \n\n[Speechmatics]
          }
          const text = translation.value.translation
          if (text.length > 512) {
            const translationFile = new InputFile(new TextEncoder().encode(text), `From @${from.username}.txt`)
            await bot.api.sendDocument(ctx.chat.id, translationFile, {
              reply_to_message_id: ctx.message.message_id,
              caption: summary.slice(0, 1024)
            })
          } else {
            await ctx.reply(text, { message_thread_id: ctx.message?.message_thread_id })
          }
          ctx.transient.analytics.sessionState = RequestState.Success
        }
      } catch (e) {
        Sentry.captureException(e)
        this.logger.error(`Translation error: ${(e as Error).message}`)
        ctx.transient.analytics.sessionState = RequestState.Error
      } finally {
        ctx.transient.analytics.actualResponseTime = now()
        this.deleteTempFile(filePath)
      }
    } else {
      this.logger.error(`Cannot find translation job ${requestKey}, skip`)
      ctx.transient.analytics.actualResponseTime = now()
      ctx.transient.analytics.sessionState = RequestState.Success
    }
  }
}
