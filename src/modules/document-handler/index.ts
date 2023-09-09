import {OnMessageContext, RefundCallback} from "../types";
import {Api, TelegramClient} from "telegram";
import pino, {Logger} from "pino";
import {chatCompletion, getChatModel, getChatModelPrice, getTokenNumber} from "../open-ai/api/openAi";
import config from "../../config";
import { LRUCache } from 'lru-cache'
import { Message } from "websocket";


interface TranslationJob {
  filePath: string
  publicFileUrl: string
}

const SupportedDocuments = {
  PDF: 'application/pdf',
}

export class DocumentHandler {
  private logger: Logger
  private telegramClient?: TelegramClient
  private requestsQueue = new LRUCache({ max: 100, ttl: 1000 * 60 * 5 })
  private jobsQueue = new LRUCache<string, TranslationJob>({ max: 100, ttl: 1000 * 60 * 5 })

  public isSupportedEvent(ctx: OnMessageContext): boolean {
    let documentType = ctx.message.document?.mime_type;

    if(documentType !== undefined) {
      return Object.values(SupportedDocuments).includes(documentType);
    }

    return false;
  }


  public async onEvent(ctx: OnMessageContext, refundCallback: RefundCallback) {
    
    // const { from, document } = ctx.update.message;
    // const fileSize = document?.file_size;
    // const requestKey = `${from.id}_${fileSize}_${Math.random()*10000}`;

    // this.requestsQueue.set(requestKey, Date.now())

    // this.logger.info(`onEvent message @${from.username} (${from.id}): ${requestKey}`)

    try{

      const file = await ctx.getFile()

      console.log(file);

      // const filePath = this.getTempFilePath(filename)

      await ctx.reply("you did it kid");

    } catch(error) {

      console.error('Error:', error);

      await ctx.reply("you failed kid");

    }
  }

  // private async downloadFile(media: TypeFile) {

  //   const buffer = await this.telegramClient?.downloadMedia(media)

  // }

  // private sleep = (timeout: number) => new Promise(resolve => setTimeout(resolve, timeout))

}