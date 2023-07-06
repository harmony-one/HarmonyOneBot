import {OnMessageContext} from "../types";
import pino, {Logger} from 'pino'
import {initTelegramClient} from "./MTProtoAPI";
import {NewMessage, NewMessageEvent} from "telegram/events";
import { LRUCache } from 'lru-cache'
import {Api, TelegramClient} from "telegram";
import {Speechmatics, TranslationResult} from "./speechmatics";
import config from "../../config";
import {Buffer} from "buffer";
import fs from "fs";
import moment from 'moment'
import {Kagi} from "./kagi";

export class VoiceMemo {
  private logger: Logger
  private tempDirectory = 'public'
  private telegramClient?: TelegramClient
  private speechmatics = new Speechmatics(config.voiceMemo.speechmaticsApiKey)
  private kagi = new Kagi(config.voiceMemo.kagiApiKey)
  private audioQueue = new LRUCache({ max: 100, ttl: 1000 * 60 * 5 })

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
    this.initTgClient()
  }

  private getTempFilePath (filename: string) {
    return `./${this.tempDirectory}/${filename}`
  }

  private writeTempFile (buffer: string | Buffer, filename: string) {
    const filePath = this.getTempFilePath(filename)
    fs.writeFileSync(filePath, buffer)
    return filePath
  }

  private deleteTempFile (filename: string) {
    const filePath = this.getTempFilePath(filename)
    if(fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  }

  private async initTgClient () {
    this.telegramClient = await initTelegramClient()
    this.telegramClient.addEventHandler(this.onTelegramClientEvent.bind(this), new NewMessage({}));
    this.logger.info('VoiceMemo bot started')
  }

  private async onTelegramClientEvent(event: NewMessageEvent) {
    const { media, chatId, senderId } = event.message;
    if(chatId && media instanceof Api.MessageMediaDocument && media && media.document) {
      // @ts-ignore
      const { mimeType = '', size } = media.document
      const checkKey = `${senderId}_${size.toString()}`
      this.logger.info(`onTelegramClientEvent: ${checkKey}`)
      // const queueDocument = this.audioQueue.get(checkKey)
      if(mimeType.includes('audio')) {
        const buffer = await this.telegramClient?.downloadMedia(media);
        if(buffer) {
          const fileName = `${media.document.id.toString()}.ogg`
          const filePath = this.writeTempFile(buffer, fileName)
          const publicFileUrl = `${config.voiceMemo.servicePublicUrl}/${fileName}`
          this.logger.info(`Public file url: ${publicFileUrl}`)
          try {
            const [translation, kagiSummarization] = await Promise.all([
              this.speechmatics.getTranslation(filePath),
              this.kagi.getSummarization(publicFileUrl)
            ])
            this.logger.info(`Raw summarization: ${kagiSummarization}`)
            if(translation) {
              this.onTranslationReady(event, translation, this.enrichSummarization(kagiSummarization))
            }
          } catch (e) {
            this.logger.error('Translation error:', e)
          } finally {
            this.deleteTempFile(fileName)
          }
        }
      }
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

  private async onTranslationReady(event: NewMessageEvent, result: TranslationResult, kagiSummarization: string) {
    const { chatId, sender } = event.message;
    const { translation } = result

    const senderUsername = sender instanceof Api.User && sender.username ? sender.username : ''
    this.logger.info(`Translation for ${senderUsername} ready, length: ${translation.length}`)
    if(translation.length < 512) {
      await this.telegramClient?.sendMessage(chatId as any, {
        message: translation,
        replyTo: event.message
      })
    } else {
      const file = new Buffer(translation)
      const messageDate = moment(event.message.date * 1000).utcOffset(-7).format('MM-DD h:mm a')
      // hack from gramjs type docs
      // @ts-ignore
      file.name = `${senderUsername ? 'From  @'+senderUsername : ''} ${messageDate}.txt`
      await this.telegramClient?.sendFile(chatId as any, {
        file,
        replyTo: event.message,
        caption: kagiSummarization.slice(0, 1024) || translation.slice(0, 512)
      })
    }
  }

  public isSupportedEvent(ctx: OnMessageContext) {
    const { voice } = ctx.update.message
    return voice && (voice.mime_type && voice.mime_type.includes('audio'))
  }

  public async onEvent(ctx: OnMessageContext) {
    const { voice, from } = ctx.update.message
    // const key = `${from.id}_${voice?.file_size}`
    // this.audioQueue.set(key, Date.now())
    // this.logger.info(`onEvent: ${key}`)
  }
}
