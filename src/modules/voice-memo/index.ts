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

export class VoiceMemo {
  private logger: Logger
  private tempDirectory = 'temp'
  private telegramClient?: TelegramClient
  private speechmatics = new Speechmatics(config.voiceMemo.speechmaticsApiKey)
  private audioQueue = new LRUCache({ max: 500, ttl: 1000 * 60 * 10 })

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
    this.logger.info('VoiceMemo started')
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
  }

  private async onTelegramClientEvent(event: NewMessageEvent) {
    const { media, chatId, message, senderId, sender } = event.message;

    if(chatId && media instanceof Api.MessageMediaDocument && media && media.document) {
      const buffer = await this.telegramClient?.downloadMedia(media);
      if(buffer instanceof Buffer) {
        const fileName = `${media.document.id.toString()}.ogg`
        const filePath = this.writeTempFile(buffer, fileName)
        const translation = await this.speechmatics.getTranslation(filePath)
        this.deleteTempFile(fileName)

        if(translation) {
          this.onTranslationReady(event, translation)
        }
      }
    }
  }

  private async onTranslationReady(event: NewMessageEvent, result: TranslationResult) {
    const { chatId, sender } = event.message;
    const { translation, summarization } = result

    const senderUsername = sender instanceof Api.User && sender.username ? sender.username : ''

    if(translation.length < 512) {
      console.log('Translation ready:', translation)
      await this.telegramClient?.sendMessage(chatId as any, {
        message: translation,
        replyTo: event.message
      })
    } else {
      console.log('Translation ready, length:', translation.length)
      const file = new Buffer(translation)

      const messageDate = moment(event.message.date * 1000).utcOffset(-7).format('MM-DD h:mm a')
      const fileName = `${senderUsername ? 'From  @'+senderUsername : ''} ${messageDate}.txt`
      console.log('Filename:', fileName)
      // hack from gramjs type docs
      // @ts-ignore
      file.name = fileName
      await this.telegramClient?.sendFile(chatId as any, {
        file,
        replyTo: event.message,
        caption: summarization.slice(0, 1024) || translation.slice(0, 1024)
      })
    }
  }

  public isSupportedEvent(ctx: OnMessageContext) {
    return !!ctx.update.message.voice
  }

  public async onEvent(ctx: OnMessageContext) {
    const { text, voice, from } = ctx.update.message
    console.log('voice: ', voice)
    console.log('from.id', from.id)
  }
}
