import { InlineKeyboard } from 'grammy'
import config from '../../config'
import pino, { type Logger } from 'pino'
import { type OnMessageContext } from '../types'
export class Wallet {
  private readonly logger: Logger

  constructor () {
    this.logger = pino({
      name: 'Wallet',
      transport: {
        target: 'pino-pretty',
        options: { colorize: true }
      }
    })
    this.logger.info(`Wallet started, web app url: ${config.wallet.webAppUrl}`)
  }

  public isSupportedEvent (ctx: OnMessageContext) {
    const { text, chat } = ctx.update.message
    return chat.type === 'private' && text && text.toLowerCase() === '/wallet'
  }

  public async onEvent (ctx: OnMessageContext) {
    const { text, from: { id: userId, username } } = ctx.update.message
    this.logger.info(`Message from ${username} (${userId}): "${text}"`)

    let keyboard = new InlineKeyboard().webApp(
      'Open',
      `${config.wallet.webAppUrl}`
    )

    // /wallet send 0x199177Bcc7cdB22eC10E3A2DA888c7811275fc38 0.01
    if (text && text.includes('send')) {
      const [,,to = '', amount = ''] = text.split(' ')
      if (to.startsWith('0x') && +amount) {
        keyboard = new InlineKeyboard().webApp(
          'Confirm transaction',
          `${config.wallet.webAppUrl}/send?userId=${userId}&type=transfer&amount=${amount}&to=${to}&step=confirm`
        )
      }
    }

    await ctx.reply('Harmony ONE Wallet', {
      reply_markup: keyboard,
      message_thread_id: ctx.message?.message_thread_id
    })
  }
}
