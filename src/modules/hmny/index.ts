import { GrammyError } from 'grammy'
import * as Sentry from '@sentry/node'
import { type Logger, pino } from 'pino'
import {
  type OnMessageContext,
  type OnCallBackQueryData,
  RequestState,
  type PayableBot
} from '../types'
import { isAdmin } from '../llms/utils/context'
import { sendMessage, MAX_TRIES } from '../llms/utils/helpers'
import { sleep } from '../sd-images/utils'
import { now } from '../../utils/perf'
import { statsService } from '../../database/services'
import { type BroadcastError } from './types'
// import { docsMenu, docsMenuLabel } from './helpers'

export enum SupportedCommands {
  broadcast = 'broadcast',
  preview = 'preview'
  // docs = 'docs'
}

export class HmnyBot implements PayableBot {
  public readonly module = 'HmnyAdminBot'
  private readonly logger: Logger

  constructor () {
    this.logger = pino({
      name: this.module,
      transport: {
        target: 'pino-pretty',
        options: { colorize: true }
      }
    })
  }

  public isSupportedEvent (
    ctx: OnMessageContext | OnCallBackQueryData
  ): boolean {
    const hasCommand = ctx.hasCommand(
      Object.values(SupportedCommands).map((command) => command)
    )
    const hasPrefix = this.hasPrefix(ctx.message?.text ?? '')
    if (hasPrefix) {
      return true
    }
    return hasCommand
  }

  private hasPrefix (prompt: string): boolean {
    return false
  }

  public getEstimatedPrice (ctx: any): number {
    return 0
  }

  public async onEvent (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    ctx.transient.analytics.module = this.module
    if (!this.isSupportedEvent(ctx)) {
      this.logger.warn(`### unsupported command ${ctx.message?.text}`)
      return
    }

    // if (ctx.hasCommand(SupportedCommands.docs)) {
    //   await this.onDocsMenu(ctx)
    //   return
    // }

    if (ctx.hasCommand(SupportedCommands.preview)) {
      await this.onBroadcast(ctx, true)
      return
    }

    if (ctx.hasCommand(SupportedCommands.broadcast)) {
      await this.onBroadcast(ctx)
      return
    }

    this.logger.warn('### unsupported command')
    await ctx.reply('### unsupported command', { message_thread_id: ctx.message?.message_thread_id })
    ctx.transient.analytics.actualResponseTime = now()
    ctx.transient.analytics.sessionState = RequestState.Error
  }

  // onDocsMenu = async (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> => {
  //   const keyboard = new InlineKeyboard()
  //   let menu = ''
  //   const isPrivate = ctx.chat?.type === 'private'
  //   const linksPreview = docsMenu.length > 1
  //   if (isPrivate) {
  //     docsMenu.forEach(item => {
  //       keyboard.webApp(item.label, item.url).row()
  //     })
  //   } else {
  //     menu = '\n'
  //     docsMenu.forEach(item => {
  //       menu += `[${item.label}](${item.url})\n`
  //     })
  //   }
  //   await ctx.reply(`${docsMenuLabel}\n${menu}`, {
  //     reply_markup: isPrivate ? keyboard : undefined,
  //     parse_mode: 'Markdown',
  //     link_preview_options: { is_disabled: linksPreview },
  //     message_thread_id: ctx.message?.message_thread_id
  //   })
  //   ctx.transient.analytics.actualResponseTime = now()
  //   ctx.transient.analytics.sessionState = RequestState.Success
  // }

  onBroadcast = async (ctx: OnMessageContext | OnCallBackQueryData, isPreview = false): Promise<void> => {
    const chatErrors: BroadcastError[] = []
    let errorMessage = ''
    if (await isAdmin(ctx, false, true) && ctx.chat?.type === 'private') {
      if (!ctx.match) {
        await ctx.reply('Missing broadcast message', { message_thread_id: ctx.message?.message_thread_id })
        ctx.transient.analytics.sessionState = RequestState.Error
        ctx.transient.analytics.actualResponseTime = now()
        return
      }
      const urls = ctx.entities('url')
      const linksPreview = urls.length > 1
      if (isPreview) {
        await ctx.reply(
          ctx.match as string,
          {
            parse_mode: 'Markdown',
            link_preview_options: { is_disabled: linksPreview }
          })
        return
      }
      const chatsArray = await statsService.getAllChatId()
      // const chatsArray = [
      //   1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
      //   21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
      //   41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60,
      //   61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80,
      //   81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100,
      //   101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120,
      //   121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140,
      //   141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160,
      //   161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180,
      //   181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200,
      //   201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220,
      //   221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240,
      //   241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255, 256, 257, 258, 259, 260,
      //   261, 262, 263, 264, 265, 266, 267, 268, 269, 270, 271, 272, 273, 274, 275, 276, 277, 278, 279, 280,
      //   281, 282, 283, 284, 285, 286, 287, 288, 289, 290, 291, 292, 293, 294, 295, 296, 297, 298, 299, 300,
      //   301, 302, 303, 304, 305, 306, 307, 308, 309, 310, 311, 312, 313, 314, 315, 316, 317, 318, 319, 320,
      //   321, 322, 323, 324, 325, 326, 327, 328, 329, 330, 331, 332, 333, 334, 335, 336, 337, 338, 339, 340,
      //   341, 342, 343, 344, 345, 346, 347, 348, 349, 350, 351, 352, 353, 354, 355, 356, 357, 358, 359, 360,
      //   361, 362, 363, 364, 365, 366, 367, 368, 369, 370, 371, 372, 373, 374, 375, 376, 377, 378, 379, 380,
      //   381, 382, 383, 384, 385, 386, 387, 388, 389, 390, 391, 392, 393, 394, 395, 396, 397, 398, 399, 400
      // ]
      let counter = 0
      const batchSize = 29
      const delayMs = 2000
      for (let i = 0; i < chatsArray.length; i += batchSize) {
        const batch = chatsArray.slice(i, i + batchSize)

        await Promise.all(batch.map(async chat => {
          if (chat !== ctx.chat?.id) {
            try {
              await ctx.api.sendMessage(
                chat,
                ctx.match as string,
                {
                  parse_mode: 'Markdown',
                  link_preview_options: { is_disabled: linksPreview }
                })
              counter++
            } catch (e) {
              if (e instanceof GrammyError) {
                chatErrors.push({
                  chatId: chat,
                  errorMessage: e.message
                })
              } else {
                chatErrors.push({
                  chatId: chat,
                  errorMessage: ''
                })
              }
            }
          }
        }))
        if (i + batchSize < chatsArray.length) {
          this.logger.info(`Sleeping for ${delayMs}ms after sending ${batchSize} messages`)
          await sleep(delayMs)
        }
      }
      ctx.session.lastBroadcast = ctx.match as string
      if (chatErrors.length > 0) {
        errorMessage += '\n*Errors:*\n'
        chatErrors.forEach(error => {
          errorMessage += `${error.chatId}: ${error.errorMessage}\n`
        })
      }
      await ctx.reply(`Broadcast send successfully to ${counter} chats. ${errorMessage}`,
        { parse_mode: 'Markdown' })
    } else {
      await ctx.reply('This command is reserved', { message_thread_id: ctx.message?.message_thread_id })
      ctx.transient.analytics.sessionState = RequestState.Error
      ctx.transient.analytics.actualResponseTime = now()
    }
  }

  async onError (
    ctx: OnMessageContext | OnCallBackQueryData,
    ex: any,
    retryCount: number = MAX_TRIES,
    msg?: string
  ): Promise<void> {
    ctx.transient.analytics.sessionState = RequestState.Error
    Sentry.setContext('open-ai', { retryCount, msg })
    Sentry.captureException(ex)
    if (retryCount === 0) {
      // Retry limit reached, log an error or take alternative action
      this.logger.error(`Retry limit reached for error: ${ex}`)
      return
    }
    if (ex instanceof GrammyError) {
      if (ex.error_code === 400 && ex.description.includes('not enough rights')) {
        await sendMessage(
          ctx,
          'Error: The bot does not have permission to send photos in chat'
        )
        ctx.transient.analytics.actualResponseTime = now()
      } else if (ex.error_code === 429) {
        const retryAfter = ex.parameters.retry_after
          ? ex.parameters.retry_after < 60
            ? 60
            : ex.parameters.retry_after * 2
          : 60
        const method = ex.method
        const errorMessage = `On method "${method}" | ${ex.error_code} - ${ex.description}`
        this.logger.error(errorMessage)
        await sendMessage(
          ctx,
          `${
            ctx.from.username ? ctx.from.username : ''
          } Bot has reached limit, wait ${retryAfter} seconds`
        ).catch(async (e) => { await this.onError(ctx, e, retryCount - 1) })
        ctx.transient.analytics.actualResponseTime = now()
        if (method === 'editMessageText') {
          ctx.session.chatGpt.chatConversation.pop() // deletes last prompt
        }
        await sleep(retryAfter * 1000) // wait retryAfter seconds to enable bot
      } else {
        this.logger.error(
          `On method "${ex.method}" | ${ex.error_code} - ${ex.description}`
        )
      }
    } else {
      this.logger.error(`${ex.toString()}`)
      await sendMessage(ctx, 'Error handling your request')
        .catch(async (e) => { await this.onError(ctx, e, retryCount - 1) }
        )
      ctx.transient.analytics.actualResponseTime = now()
    }
  }
}
