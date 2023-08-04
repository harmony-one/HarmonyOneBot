import { InlineKeyboard } from "grammy";
import { relayApi } from "./api/relayApi";
import { AxiosError } from "axios";
import { isDomainAvailable, validateDomainName } from "./utils/domain";
import config from "../../config";
import { OnMessageContext, OnCallBackQueryData } from "../types";
import { getUrl } from "./utils/";
import { Logger, pino } from "pino";

enum SupportedCommands {
  CHECK = "check",
  NFT = "nft",
  VISIT = "visit",
  CERT = "cert",
  RENEW = "renew",
  NOTION = "notion",
}

export class OneCountryBot {
  private logger: Logger;

  constructor() {
    this.logger = pino({
      name: "OneCountryBot-conversation",
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
        },
      },
    });
  }

  public isSupportedEvent(
    ctx: OnMessageContext | OnCallBackQueryData
  ): boolean {
    const hasCommand = ctx.hasCommand(Object.values(SupportedCommands));

    if (hasCommand && !ctx.match) {
      ctx.reply("Error: Missing prompt");
      return false;
    }
    return hasCommand;
  }

  public getEstimatedPrice(ctx: any) {
    return 0;
  }

  public async onEvent(ctx: OnMessageContext | OnCallBackQueryData) {
    if (!this.isSupportedEvent(ctx)) {
      console.log(`### unsupported command ${ctx.message?.text}`);
      return false;
    }

    if (ctx.hasCommand(SupportedCommands.VISIT)) {
      this.onVistitCmd(ctx);
      return;
    }

    if (ctx.hasCommand(SupportedCommands.CHECK)) {
      this.onCheckCmd(ctx);
      return;
    }

    if (ctx.hasCommand(SupportedCommands.NFT)) {
      this.onNftCmd(ctx);
      return;
    }

    if (ctx.hasCommand(SupportedCommands.CERT)) {
      this.onCertCmd(ctx);
      return;
    }

    if (ctx.hasCommand(SupportedCommands.RENEW)) {
      this.onRenewCmd(ctx);
      return;
    }

    if (ctx.hasCommand(SupportedCommands.NOTION)) {
      this.onNotionCmd(ctx);
      return;
    }

    console.log(`### unsupported command`);
    ctx.reply("### unsupported command");
  }

  onVistitCmd = async (ctx: OnMessageContext | OnCallBackQueryData) => {
    if (!ctx.match) {
      ctx.reply("Error: Missing 1.country domain");
      return;
    }

    const url = getUrl(ctx.match as string);
    let keyboard = new InlineKeyboard().webApp("Go", `https://${url}/`);

    ctx.reply(`Visit ${url}`, {
      reply_markup: keyboard,
    });
  };

  onRenewCmd = (ctx: OnMessageContext | OnCallBackQueryData) => {
    if (!ctx.match) {
      ctx.reply("Error: Missing 1.country domain");
      return;
    }
    const url = getUrl(ctx.match as string);
    let keyboard = new InlineKeyboard()
      .webApp("Renew in 1.country", `https://${url}/?renew`)
      .row()
      .webApp(
        "Rent using your local wallet (under construction)",
        `https://${url}/?renew`
      );

    ctx.reply(`Renew ${url}`, {
      reply_markup: keyboard,
    });
  };

  onNotionCmd = (ctx: OnMessageContext | OnCallBackQueryData) => {
    const prompt: any = ctx.match;
    if (!prompt) {
      ctx.reply("Error: Missing alias and url");
      return;
    }
    // const [alias = "", url = ""] = prompt.split(" ");
    // if (url.includes("notion") || url.includes("substack")) {
    //   let keyboard = new InlineKeyboard()
    //     .webApp("Process the Notion page Renew in 1.country", `https://fegloff.country/?${alias}#=${url}`)
    //     .row()
    //     .webApp(
    //       "Rent using your local wallet (under construction)",
    //       `https://${url}/?renew`
    //     );

    //   ctx.reply(`Renew ${url}`, {
    //     reply_markup: keyboard,
    //   });
    // }
  };

  onCertCmd = async (ctx: OnMessageContext | OnCallBackQueryData) => {
    if (!ctx.match) {
      ctx.reply("Error: Missing 1.country domain");
      return;
    }
    const url = getUrl(ctx.match as string);
    try {
      const response = await relayApi().createCert({ domain: url });
      if (!response.error) {
        ctx.reply(`The SSL certificate of ${url} was renewed`);
      } else {
        ctx.reply(`${response.error}`);
      }
    } catch (e) {
      this.logger.error(
        e instanceof AxiosError
          ? e.response?.data.error
          : "There was an error processing your request"
      );
      ctx.reply(
        e instanceof AxiosError
          ? e.response?.data.error
          : "There was an error processing your request"
      );
    }
  };

  onNftCmd = async (ctx: OnMessageContext | OnCallBackQueryData) => {
    const url = getUrl(ctx.match as string);
    try {
      const response = await relayApi().genNFT({ domain: url });
      ctx.reply("NFT metadata generated");
    } catch (e) {
      this.logger.error(
        e instanceof AxiosError
          ? e.response?.data.error
          : "There was an error processing your request"
      );
      ctx.reply(
        e instanceof AxiosError
          ? e.response?.data.error
          : "There was an error processing your request"
      );
    }
  };

  onCheckCmd = async (ctx: OnMessageContext | OnCallBackQueryData) => {
    let domain = this.cleanInput(ctx.match as string);
    const avaliable = await isDomainAvailable(domain);
    let msg = `The name *${domain}* `;
    if (!avaliable.isAvailable && avaliable.isInGracePeriod) {
      msg += `is in grace period ❌. Only the owner is able to renew the domain`;
    } else if (!avaliable.isAvailable) {
      msg += `is unavailable ❌.\nWrite */visit ${domain}* to check it out!`;
    } else {
      msg += "is available ✅.\n";
      if (!avaliable.priceUSD.error) {
        msg += `${avaliable.priceOne} ONE = ${avaliable.priceUSD.price} USD for 30 days\n`;
      } else {
        msg += `${avaliable.priceOne} for 30 days\n`;
      }
      msg += `Write */rent ${domain}* to purchase it`;
    }
    ctx.reply(msg, {
      parse_mode: "Markdown",
    });
  };

  private cleanInput = (input: string) => {
    return input.replace(/[^a-z0-9-]/g, "").toLowerCase();
  };
}
