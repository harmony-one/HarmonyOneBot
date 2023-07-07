import {InlineKeyboard} from "grammy";
import otpAuth from 'otpauth'
import config from '../../config'
import pino, {Logger} from "pino";
export class Wallet {
  private readonly secret = config.wallet.secret
  private logger: Logger;

  constructor() {
    this.logger = pino({
      name: 'Wallet',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true
        }
      }
    })
    this.logger.info(`Wallet started, web app url: ${config.wallet.webAppUrl}`)
  }

  public isSupportedEvent(ctx: any) {
    const { text } = ctx.update.message
    return text.toLowerCase().startsWith('/wallet')
  }

  public async onEvent(ctx: any) {
    const { text, from: { id: userId, username } } = ctx.update.message
    console.log(`Message from ${username} (${userId}): "${text}"`)

    const secret = otpAuth.Secret.fromUTF8(`${this.secret}_${userId}`).base32
    const keyboard = new InlineKeyboard().webApp(
      "Open Wallet",
      `${config.wallet.webAppUrl}/?secret=${secret}&userId=${userId}`,
    );

    ctx.reply('Test', {
      reply_markup: keyboard
    });
  }
}
