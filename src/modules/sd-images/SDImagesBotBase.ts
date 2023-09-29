import { getModelByParam, type IModel, SDNodeApi } from './api'
import { type OnCallBackQueryData, type OnMessageContext, RequestState } from '../types'
import { getTelegramFileUrl, loadFile, sleep, uuidv4 } from './utils'
import { GrammyError, InputFile } from 'grammy'
import { COMMAND } from './helpers'
import { type Logger, pino } from 'pino'
import { type ILora } from './api/loras-config'
import { getParamsFromPrompt } from './api/helpers'
import { type IBalancerOperation, OPERATION_STATUS, completeOperation, createOperation, getOperationById } from './balancer'
import { now } from '../../utils/perf'

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

  waitingQueue = async (
    session: ISession,
    ctx: OnMessageContext | OnCallBackQueryData
  ): Promise<{ queueMessageId: number, balancerOperaton: IBalancerOperation }> => {
    const params = getParamsFromPrompt(session.prompt)

    const lora = params.loraName ? `${params.loraName}.safetensors` : session.lora?.path

    let balancerOperaton = await createOperation({
      model: session.model.path,
      lora,
      type: session.command
    })

    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { message_id } = await ctx.reply(
      `You are #${balancerOperaton.queueTotalNumber + 1} in line for making images. The wait time is about ${(balancerOperaton.queueNumber + 1) * 15} seconds.`, { message_thread_id: ctx.message?.message_thread_id }
    )
    ctx.transient.analytics.firstResponseTime = now()
    // waiting queue
    while (balancerOperaton.status === OPERATION_STATUS.WAITING) {
      await sleep(5000 * balancerOperaton.queueNumber || 500)
      balancerOperaton = await getOperationById(balancerOperaton.id)
    }

    return {
      queueMessageId: message_id,
      balancerOperaton
    }
  }

  generateImage = async (
    ctx: OnMessageContext | OnCallBackQueryData,
    refundCallback: (reason?: string) => void,
    session: ISession,
    specialMessage?: string
  ): Promise<void> => {
    const { model, prompt, seed, lora } = session

    let balancerOperatonId

    try {
      const { queueMessageId, balancerOperaton } = await this.waitingQueue(session, ctx)
      balancerOperatonId = balancerOperaton.id

      ctx.chatAction = 'upload_photo'

      const imageBuffer = await this.sdNodeApi.generateImage({
        prompt,
        model,
        seed,
        lora
      }, balancerOperaton.server)

      if (balancerOperatonId) {
        await completeOperation(balancerOperatonId, OPERATION_STATUS.SUCCESS)
      }

      const reqMessage = session.message
        ? session.message.split(' ').length > 1
          ? session.message
          : `${session.message} ${prompt}`
        : `/${model.aliases[0]} ${prompt}`
      await ctx.replyWithPhoto(new InputFile(imageBuffer), {
        caption: specialMessage ?? reqMessage,
        message_thread_id: ctx.message?.message_thread_id
      })
      if (ctx.chat?.id && queueMessageId) {
        await ctx.api.deleteMessage(ctx.chat?.id, queueMessageId)
      }
      ctx.transient.analytics.sessionState = RequestState.Success
    } catch (e: any) {
      if (balancerOperatonId) {
        await completeOperation(balancerOperatonId, OPERATION_STATUS.ERROR)
      }

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
      ctx.transient.analytics.sessionState = RequestState.Error
      refundCallback()
    }
  }

  generateImageByImage = async (
    ctx: OnMessageContext | OnCallBackQueryData,
    refundCallback: (reason?: string) => void,
    session: ISession
  ): Promise<void> => {
    const { model, prompt, seed, lora } = session

    let balancerOperatonId

    try {
      const { queueMessageId, balancerOperaton } = await this.waitingQueue(session, ctx)
      balancerOperatonId = balancerOperaton.id

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
      }, balancerOperaton.server)

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
      ctx.transient.analytics.sessionState = RequestState.Success
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
      ctx.transient.analytics.sessionState = RequestState.Error
      refundCallback()
    } finally {
      ctx.transient.analytics.actualResponseTime = now()
    }

    if (balancerOperatonId) {
      await completeOperation(balancerOperatonId, OPERATION_STATUS.SUCCESS)
    }
  }

  trainLoraByImages = async (
    ctx: OnMessageContext | OnCallBackQueryData,
    refundCallback: (reason?: string) => void,
    session: ISession
  ): Promise<void> => {
    const { model, prompt } = session
    let balancerOperatonId

    try {
      const { balancerOperaton } = await this.waitingQueue(session, ctx)
      balancerOperatonId = balancerOperaton.id

      ctx.chatAction = 'upload_photo'

      let photosIds: string[] = []
      let filesBuffer: Buffer[] = []

      const [, caption] = (ctx.message?.text ?? '').split(' ')

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

      await this.sdNodeApi.train({
        filesBuffer,
        prompt,
        ctx,
        server: balancerOperaton.server
      })

      const params = getParamsFromPrompt(prompt)
      const [loraName] = prompt.split(' ')

      const modelAlias = params.modelAlias || 'del'

      if (balancerOperatonId) {
        await completeOperation(balancerOperatonId, OPERATION_STATUS.SUCCESS)
      }

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
      ctx.transient.analytics.sessionState = RequestState.Success
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
      ctx.transient.analytics.sessionState = RequestState.Error
      refundCallback()

      if (balancerOperatonId) {
        await completeOperation(balancerOperatonId, OPERATION_STATUS.ERROR)
      }
    } finally {
      ctx.transient.analytics.actualResponseTime = now()
    }
  }
}
