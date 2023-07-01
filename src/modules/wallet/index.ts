import {InlineKeyboard} from "grammy";
import otpAuth from 'otpauth'
import config from '../../config'
export class Wallet {
  private readonly secret = config.wallet.secret

  constructor() {}

  public isSupportedEvent(ctx: any) {
    return true
  }

  public async onEvent(ctx: any) {
    const { text, from: { id: userId, username } } = ctx.update.message
    console.log(`Message from ${username} (${userId}): "${text}"`)

    const secret = otpAuth.Secret.fromUTF8(`${this.secret}_${userId}`).base32
    const keyboard = new InlineKeyboard().webApp(
      "Open Wallet",
      `https://wallet-web-app.netlify.app/?secret=${secret}&userId=${userId}`,
    );

    ctx.reply('Test', {
      reply_markup: keyboard
    });
  }
}
