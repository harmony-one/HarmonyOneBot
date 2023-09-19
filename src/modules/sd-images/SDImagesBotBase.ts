import { getModelByParam, type IModel, SDNodeApi } from './api'
import { type OnCallBackQueryData, type OnMessageContext, SessionState } from '../types'
import { getTelegramFileUrl, loadFile, sleep, uuidv4 } from './utils'
import { GrammyError, InputFile } from 'grammy'
import { COMMAND } from './helpers'
import { type Logger, pino } from 'pino'
import { type ILora } from './api/loras-config'
import { getParamsFromPrompt } from './api/helpers'

export interface MessageExtras {
  caption?: string
  message_thread_id?: number
  parse_mode?: any
}

export interface ISession {
  id: string
  author: string
  prompt: string
  model: IModel
  lora?: ILora
  all_seeds?: string[]
  seed?: number
  command: COMMAND
  message: string
}

export interface IMediaGroup {
  mediaGroupId: string
  photosIds: string[]
  caption: string
}

export class SDImagesBotBase {
  sdNodeApi: SDNodeApi
  private readonly logger: Logger
  private readonly mediaGroupCache: IMediaGroup[] = []

  private readonly sessions: ISession[] = []
  queue: string[] = []
  queue2: string[] = []

  constructor () {
    this.sdNodeApi = new SDNodeApi()
    this.logger = pino({
      name: 'SDImagesBotBase',
      transport: {
        target: 'pino-pretty',
        options: { colorize: true }
      }
    })
  }

  addMediaGroupPhoto = (params: { photoId: string, mediaGroupId: string, caption: string }): void => {
    const mediaGroup = this.mediaGroupCache.find(m => m.mediaGroupId === params.mediaGroupId)

    if (mediaGroup) {
      mediaGroup.caption = mediaGroup.caption || params.caption
      mediaGroup.photosIds.push(params.photoId)
    } else {
      this.mediaGroupCache.push({
        photosIds: [params.photoId],
        mediaGroupId: params.mediaGroupId,
        caption: params.caption
      })
    }
  }

  createSession = async (
    ctx: OnMessageContext | OnCallBackQueryData,
    params: {
      prompt: string
      model: IModel
      lora?: ILora
      command: COMMAND
      all_seeds?: string[]
      seed?: string
    }
  ): Promise<ISession> => {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { prompt, model, command, all_seeds, lora } = params

    const authorObj = await ctx.getAuthor()
    const author = `@${authorObj.user.username}`

    const sessionId = uuidv4()
    const message = (ctx.message?.text ?? '').replace('/images', '/image')

    const newSession: ISession = {
      id: sessionId,
      author,
      prompt,
      model,
      lora,
      command,
      all_seeds,
      message
    }

    this.sessions.push(newSession)

    return newSession
  }

  getSessionById = (id: string): ISession | undefined => this.sessions.find(s => s.id === id)

  waitingQueue = async (uuid: string, ctx: OnMessageContext | OnCallBackQueryData): Promise<number> => {
    this.queue.push(uuid)
    let idx = this.queue.findIndex((v) => v === uuid)

    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { message_id } = await ctx.reply(
      `You are #${idx + 1} in line for making images. The wait time is about ${(idx + 1) * 15} seconds.`, { message_thread_id: ctx.message?.message_thread_id }
    )
    ctx.session.analytics.firstResponseTime = performance.now()
    // waiting queue
    while (idx !== 0) {
      await sleep(3000 * this.queue.findIndex((v) => v === uuid))
      idx = this.queue.findIndex((v) => v === uuid)
    }

    return message_id
  }

  // TODO
  waitingQueue2 = async (uuid: string, ctx: OnMessageContext | OnCallBackQueryData): Promise<number> => {
    this.queue2.push(uuid)
    let idx = this.queue2.findIndex((v) => v === uuid)

    const { message_id: messageId } = await ctx.reply(
      `You are #${idx + 1} in line for making images. The wait time is about ${(idx + 1) * 15} seconds.`, { message_thread_id: ctx.message?.message_thread_id }
    )
    ctx.session.analytics.firstResponseTime = performance.now()
    // waiting queue
    while (idx !== 0) {
      await sleep(3000 * this.queue2.findIndex((v) => v === uuid))
      idx = this.queue2.findIndex((v) => v === uuid)
    }

    return messageId
  }

  generateImage = async (
    ctx: OnMessageContext | OnCallBackQueryData,
    refundCallback: (reason?: string) => void,
    session: ISession,
    specialMessage?: string
  ): Promise<void> => {
    const { model, prompt, seed, lora } = session
    const uuid = uuidv4()

    try {
      let queueMessageId

      if (model.serverNumber === 2) {
        queueMessageId = await this.waitingQueue2(uuid, ctx)
      } else {
        queueMessageId = await this.waitingQueue(uuid, ctx)
      }

      ctx.chatAction = 'upload_photo'

      const imageBuffer = await this.sdNodeApi.generateImage({
        prompt,
        model,
        seed,
        lora
      })

      const reqMessage = session.message
        ? session.message.split(' ').length > 1
          ? session.message
          : `${session.message} ${prompt}`
        : `/${model.aliases[0]} ${prompt}`
      await ctx.replyWithPhoto(new InputFile(imageBuffer), {
        caption: reqMessage,
        message_thread_id: ctx.message?.message_thread_id
      })
      if (ctx.chat?.id && queueMessageId) {
        await ctx.api.deleteMessage(ctx.chat?.id, queueMessageId)
      }
      ctx.session.analytics.sessionState = SessionState.Success
    } catch (e: any) {
      ctx.chatAction = null
      const msgExtras: MessageExtras = { message_thread_id: ctx.message?.message_thread_id }
      if (e instanceof GrammyError) {
        if (e.error_code === 400 && e.description.includes('not enough rights')) {
          await ctx.reply('Error: The bot does not have permission to send photos in chat... Refunding payments', msgExtras)
        } else {
          await ctx.reply('Error: something went wrong... Refunding payments', msgExtras)
        }
      } else {
        this.logger.error(e.toString())
        await ctx.reply('Error: something went wrong... Refunding payments', msgExtras)
      }
      ctx.session.analytics.sessionState = SessionState.Error
      refundCallback()
    }

    if (model.serverNumber === 2) {
      this.queue2 = this.queue2.filter((v) => v !== uuid)
    } else {
      this.queue = this.queue.filter((v) => v !== uuid)
    }
  }

  generateImageByImage = async (
    ctx: OnMessageContext | OnCallBackQueryData,
    refundCallback: (reason?: string) => void,
    session: ISession
  ): Promise<void> => {
    const { model, prompt, seed, lora } = session
    const uuid = uuidv4()

    try {
      const queueMessageId = await this.waitingQueue(uuid, ctx)

      ctx.chatAction = 'upload_photo'

      let fileBuffer: Buffer
      let fileName

      const photos = ctx.message?.photo ?? ctx.message?.reply_to_message?.photo

      if (photos) {
        const photo = photos[photos.length - 1]

        const file = await ctx.api.getFile(photo.file_id)

        if (file?.file_path) {
          const url = getTelegramFileUrl(file?.file_path)
          fileName = file?.file_path

          fileBuffer = await loadFile(url)
        } else {
          throw new Error('File not found')
        }
      } else {
        throw new Error('User image not found')
      }

      const imageBuffer = await this.sdNodeApi.generateImageByImage({
        fileBuffer,
        fileName,
        prompt,
        model,
        seed,
        lora
      })

      const reqMessage = session.message
        ? session.message.split(' ').length > 1
          ? session.message
          : `${session.message} ${prompt}`
        : `/${model.aliases[0]} ${prompt}`
      const msgExtras: MessageExtras = { message_thread_id: ctx.message?.message_thread_id }
      await ctx.replyWithMediaGroup([
        {
          type: 'photo',
          media: new InputFile(fileBuffer),
          caption: reqMessage
        },
        {
          type: 'photo',
          media: new InputFile(imageBuffer)
          // caption: reqMessage,
        }
      ], msgExtras)

      if (ctx.chat?.id && queueMessageId) {
        await ctx.api.deleteMessage(ctx.chat?.id, queueMessageId)
      }
      ctx.session.analytics.sessionState = SessionState.Success
    } catch (e: any) {
      const msgExtras: MessageExtras = { message_thread_id: ctx.message?.message_thread_id }
      if (e instanceof GrammyError) {
        if (e.error_code === 400 && e.description.includes('not enough rights')) {
          await ctx.reply('Error: The bot does not have permission to send photos in chat... Refunding payments', msgExtras)
        } else {
          await ctx.reply('Error: something went wrong... Refunding payments', msgExtras)
        }
      } else {
        this.logger.error(e.toString())
        await ctx.reply('Error: something went wrong... Refunding payments', msgExtras)
      }
      ctx.session.analytics.sessionState = SessionState.Error
      refundCallback()
    } finally {
      ctx.session.analytics.actualResponseTime = performance.now()
    }

    this.queue = this.queue.filter((v) => v !== uuid)
  }

  trainLoraByImages = async (
    ctx: OnMessageContext | OnCallBackQueryData,
    refundCallback: (reason?: string) => void,
    session: ISession
  ): Promise<void> => {
    const { model, prompt } = session
    try {
      ctx.chatAction = 'upload_photo'

      let photosIds: string[] = []
      let filesBuffer: Buffer[]

      const [,caption] = (ctx.message?.text ?? '').split(' ')

      this.mediaGroupCache
        .filter(m => m.caption.replace('/train ', '') === caption)
        .forEach(m => {
          photosIds = photosIds.concat(m.photosIds)
        })

      if (photosIds) {
        filesBuffer = await Promise.all(photosIds.map(async fileId => {
          const file = await ctx.api.getFile(fileId)

          if (file?.file_path) {
            const url = getTelegramFileUrl(file?.file_path)

            const fileBuffer = await loadFile(url)

            return fileBuffer
          } else {
            throw new Error('File not found')
          }
        }))
      } else {
        throw new Error('User image not found')
      }

      await this.sdNodeApi.train(
        filesBuffer,
        prompt,
        ctx
      )

      const params = getParamsFromPrompt(prompt)
      const [loraName] = prompt.split(' ')

      const modelAlias = params.modelAlias || 'del'

      await this.generateImage(
        ctx,
        refundCallback,
        await this.createSession(ctx, {
          model: getModelByParam(modelAlias) ?? model,
          prompt: `<lora:${loraName}:1>`,
          command: COMMAND.TEXT_TO_IMAGE
        }),
        `/${modelAlias} <lora:${loraName}:1>`
      )
      ctx.session.analytics.sessionState = SessionState.Success
    } catch (e: any) {
      const topicId = ctx.message?.message_thread_id
      const msgExtras: MessageExtras = {}
      if (topicId) {
        msgExtras.message_thread_id = topicId
      }
      if (e instanceof GrammyError) {
        if (e.error_code === 400 && e.description.includes('not enough rights')) {
          await ctx.reply('Error: The bot does not have permission to send photos in chat... Refunding payments', msgExtras)
        } else {
          await ctx.reply('Error: something went wrong... Refunding payments', msgExtras)
        }
      } else {
        this.logger.error(e.toString())
        await ctx.reply('Error: something went wrong... Refunding payments', msgExtras)
      }
      ctx.session.analytics.sessionState = SessionState.Error
      refundCallback()
    } finally {
      ctx.session.analytics.actualResponseTime = performance.now()
    }
  }
}
