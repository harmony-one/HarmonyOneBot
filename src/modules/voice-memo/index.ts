import {OnMessageContext} from "../types";
import pino, {Logger} from 'pino'
import {initTelegramClient} from "./MTProtoAPI";
import {NewMessage, NewMessageEvent} from "telegram/events";
import { LRUCache } from 'lru-cache'
import {Api, TelegramClient} from "telegram";
import {Speechmatics, SpeechmaticsResult} from "./speechmatics";
import config from "../../config";
import {Buffer} from "buffer";
import fs from "fs";
import moment from 'moment'
import {Kagi} from "./kagi";
import MessageMediaDocument = Api.MessageMediaDocument;
import {InputFile} from "grammy";
import {bot} from "../../bot";

interface TranslationJob {
  filePath: string
  publicFileUrl: string
}

export class VoiceMemo {
  private logger: Logger
  private tempDirectory = 'public'
  private telegramClient?: TelegramClient
  private speechmatics = new Speechmatics(config.voiceMemo.speechmaticsApiKey)
  private kagi = new Kagi(config.voiceMemo.kagiApiKey)
  private requestsQueue = new LRUCache({ max: 100, ttl: 1000 * 60 * 5 })
  private jobsQueue = new LRUCache<string, TranslationJob>({ max: 100, ttl: 1000 * 60 * 5 })

  constructor() {
    this.logger = pino({
      name: 'VoiceMemo',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true
        }
      }
    })
    if(config.voiceMemo.isEnabled) {
      this.initTgClient()
    } else {
      this.logger.warn('Voice-memo disabled in config')
    }
  }

  private getTempFilePath (filename: string) {
    return `./${this.tempDirectory}/${filename}`
  }

  private writeTempFile (buffer: string | Buffer, filename: string) {
    const filePath = this.getTempFilePath(filename)
    fs.writeFileSync(filePath, buffer)
    return filePath
  }

  private deleteTempFile (filePath: string) {
    if(fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  }

  private sleep = (timeout: number) => new Promise(resolve => setTimeout(resolve, timeout))

  private async initTgClient () {
    this.telegramClient = await initTelegramClient()
    this.telegramClient.addEventHandler(this.onTelegramClientEvent.bind(this), new NewMessage({}));
    this.logger.info('VoiceMemo bot started')
  }

  private async downloadAudioFile(media: MessageMediaDocument) {
    const buffer = await this.telegramClient?.downloadMedia(media);
    if(buffer && media.document) {
      const fileName = `${media.document.id.toString()}.ogg`
      const filePath = this.writeTempFile(buffer, fileName)
      const publicFileUrl = `${config.voiceMemo.servicePublicUrl}/${fileName}`
      return {
        filePath,
        publicFileUrl
      }
    }
  }

  private async onTelegramClientEvent(event: NewMessageEvent) {
    const { media, chatId, senderId } = event.message;
    if(chatId && media instanceof Api.MessageMediaDocument && media && media.document) {
      // @ts-ignore
      const { size } = media.document
      const requestKey = `${senderId}_${size.toString()}`
      this.logger.info(`Request from ${senderId}: request key: ${requestKey}`)

      for(let i= 0; i < 100; i++) {
        if(this.requestsQueue.get(requestKey)) {
          this.logger.info(`Request ${requestKey} found in queue, start downloading audio file...`)
          const result = await this.downloadAudioFile(media)
          if(result) {
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

  private enrichSummarization(text: string) {
    text = text.replace('The speakers', 'We')
    const splitText = text.split('.').map(part => part.trim())
    let resultText = ''
    for(let i = 0; i < splitText.length; i++) {
      if(i % 2 !== 0) {
        continue
      }
      const sentence1 = splitText[i]
      const sentence2 = splitText[i + 1] || ''
      const twoSentences = sentence1 + (sentence2 ? '. ' + sentence2 + '.' : '')
      resultText +=  twoSentences
      if(i < splitText.length - 3) {
        resultText += '\n\n'
      }
    }
    return resultText
  }

  public isSupportedEvent(ctx: OnMessageContext) {
    const { voice } = ctx.update.message

    return config.voiceMemo.isEnabled
      && voice
      && (voice.mime_type && voice.mime_type.includes('audio'))
  }

  public getEstimatedPrice(ctx: OnMessageContext) {
    // const { update: { message: { voice } } } = ctx
    // if(voice) {
    //   return this.speechmatics.estimatePrice(voice.duration)
    // }
    return 0
  }

  public async onEvent(ctx: OnMessageContext) {
    const { message_id, voice, from } = ctx.update.message
    const requestKey = `${from.id}_${voice?.file_size}`

    this.requestsQueue.set(requestKey, Date.now())

    this.logger.info(`onEvent message @${from.username} (${from.id}): ${requestKey}`)

    let translationJob

    for(let i= 0; i < 100; i++) {
      translationJob = this.jobsQueue.get(requestKey)
      if(translationJob) {
        break;
      }
      await this.sleep(100)
    }

    if(translationJob) {
      const { filePath, publicFileUrl } = translationJob
      this.logger.info(`Public file url: ${publicFileUrl}`)
      try {
        const [translation, kagiResult] = await Promise.allSettled([
          this.speechmatics.getTranslation(filePath),
          this.kagi.getSummarization(publicFileUrl)
        ])

        // this.logger.info(`Kagi summarization: ${JSON.stringify(kagiResult)}`)
        this.logger.info(`Translation ready: ${JSON.stringify(translation)}`)

        if(translation && translation.status === 'fulfilled' && translation.value) {
          let summary = kagiResult.status === 'fulfilled'
            ? kagiResult.value
            : translation.value.summarization
          if(summary) {
            summary = this.enrichSummarization(summary)
          }
          if(kagiResult.status !== 'fulfilled' && summary) {
            summary = `${summary}\n\n[Speechmatics]`
          }
          const text = translation.value.translation
          if(text.length > 512) {
            const translationFile = new InputFile(new TextEncoder().encode(text), `From @${from.username}.txt`)
            await bot.api.sendDocument(ctx.chat.id, translationFile, {
              reply_to_message_id: ctx.message.message_id,
              caption: summary.slice(0, 1024)
            })
          } else {
            await ctx.reply(text)
          }
        }
      } catch (e) {
        this.logger.error(`Translation error: ${(e as Error).message}`)
      } finally {
        this.deleteTempFile(filePath)
      }
    }
  }
}
