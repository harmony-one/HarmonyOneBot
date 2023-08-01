import { InlineKeyboard } from "grammy";
import config from "../../config";
import pino, { Logger } from "pino";
import { OnMessageContext } from "../types";
export class WalletConnect {
  private logger: Logger;

  constructor() {
    this.logger = pino({
      name: "WalletConnect",
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
        },
      },
    });
    this.logger.info(
      `Wallet started, web app url: ${config.walletc.webAppUrl}`
    );
  }

  public getEstimatedPrice(ctx: any) {
    return 100;
  }

  public isSupportedEvent(ctx: OnMessageContext) {
    const { text, chat } = ctx.update.message
    return chat.type === 'private' && text && text.toLowerCase().startsWith('/walletconnect')
  }

  public async onEvent(ctx: OnMessageContext) {
    const {
      text,
      from: { id: userId, username },
    } = ctx.update.message;
    this.logger.info(`Message from ${username} (${userId}): "${text}"`);

    let keyboard = new InlineKeyboard().webApp(
      "Open",
      `${config.walletc.webAppUrl}/`
    );

    // /wallet send 0x199177Bcc7cdB22eC10E3A2DA888c7811275fc38 0.01
    if (text && text.includes("send")) {
      const [, , to = "", amount = ""] = text.split(" ");
      if (to.startsWith("0x") && +amount) {
        console.log(
          `${config.walletc.webAppUrl}/send?type=transfer&amount=${amount}&to=${to}&step=confirm`
        );
        keyboard = new InlineKeyboard().webApp(
          "Confirm transaction",
          `${config.walletc.webAppUrl}/send?type=transfer&amount=${amount}&to=${to}&step=confirm`
        );
      }
    }

    ctx.reply("Telegram wallet", {
      reply_markup: keyboard,
    });
  }
}
