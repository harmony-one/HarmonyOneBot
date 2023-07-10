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
    this.logger.info(`Message from ${username} (${userId}): "${text}"`)

    const secret = otpAuth.Secret.fromUTF8(`${this.secret}_${userId}`).base32

    let keyboard = new InlineKeyboard().webApp(
      "Open",
      `${config.wallet.webAppUrl}/?secret=${secret}&userId=${userId}`,
    );

    // wallet send 0x199177Bcc7cdB22eC10E3A2DA888c7811275fc38 0.01
    if(text.includes('send')) {
      const [,,to = '', amount = ''] = text.split(' ')
      if(to.startsWith('0x') && +amount) {
        keyboard = new InlineKeyboard().webApp(
          "Confirm transaction",
          `${config.wallet.webAppUrl}/send?secret=${secret}&userId=${userId}&type=transfer&amount=${amount}&to=${to}&step=confirm`,
        );
      }
    }

    ctx.reply('Telegram wallet', {
      reply_markup: keyboard
    });
  }
}
