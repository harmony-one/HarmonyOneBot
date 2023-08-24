import { InlineKeyboard, GrammyError } from "grammy";
import { relayApi } from "./api/relayApi";
import { AxiosError } from "axios";
import { isDomainAvailable, validateDomainName } from "./utils/domain";
import { appText } from "./utils/text";
import { OnMessageContext, OnCallBackQueryData } from "../types";
import { getCommandNamePrompt, getUrl } from "./utils/";
import { Logger, pino } from "pino";
import { isAdmin } from "../open-ai/utils/context";
import config from "../../config";
import { sleep } from "../sd-images/utils";

export const SupportedCommands = {
  register: {
    name: "register",
    groupParams: ">0",
    privateParams: ">0",
  },
  visit: {
    name: "visit",
    groupParams: "=1", // TODO: add support for groups
    privateParams: "=1",
  },
  check: {
    name: "check",
    groupParams: "=1", // TODO: add support for groups
    privateParams: "=1",
  },
  cert: {
    name: "cert",
    groupParams: "=1", // TODO: add support for groups
    privateParams: "=1",
  },
  nft: {
    name: "nft",
    groupParams: "=1", // TODO: add support for groups
    privateParams: "=1",
  },
};

// enum SupportedCommands {
//   CHECK = "check",
//   NFT = "nft",
//   VISIT = "visit",
//   CERT = "cert",
//   RENEW = "renew",
//   NOTION = "notion",
//   SUBDOMAIN = "subdomain",
// }

export class OneCountryBot {
  private logger: Logger;
  private botSuspended: boolean;

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
    this.botSuspended = false;
  }

  public isSupportedEvent(
    ctx: OnMessageContext | OnCallBackQueryData
  ): boolean {
    const hasCommand = ctx.hasCommand(
      Object.values(SupportedCommands).map((command) => command.name)
    );
    const hasPrefix = this.hasPrefix(ctx.message?.text || "");
    if (hasPrefix && ctx.session.oneCountry.lastDomain) {
      return true;
    }
    return hasCommand;
  }

  public isValidCommand(ctx: OnMessageContext | OnCallBackQueryData): boolean {
    const { commandName, prompt } = getCommandNamePrompt(
      ctx,
      SupportedCommands
    );
    const promptNumber = prompt === "" ? 0 : prompt.split(" ").length;
    if (!commandName) {
      const hasGroupPrefix = this.hasPrefix(ctx.message?.text || "");
      if (hasGroupPrefix && promptNumber > 1) {
        return true;
      }
      return false;
    }
    const command = Object.values(SupportedCommands).filter((c) =>
      commandName.includes(c.name)
    )[0];
    const comparisonOperator =
      ctx.chat?.type === "private"
        ? command.privateParams[0]
        : command.groupParams[0];
    const comparisonValue = parseInt(
      ctx.chat?.type === "private"
        ? command.privateParams.slice(1)
        : command.groupParams.slice(1)
    );
    switch (comparisonOperator) {
      case ">":
        if (promptNumber >= comparisonValue) {
          return true;
        }
        break;
      case "=":
        if (promptNumber === comparisonValue) {
          return true;
        }
        break;
      default:
        break;
    }
    return false;
  }

  private hasPrefix(prompt: string): boolean {
    const prefixList = config.country.registerPrefix;
    for (let i = 0; i < prefixList.length; i++) {
      if (prompt.startsWith(prefixList[i])) {
        return true;
      }
    }
    return false;
  }
  public getEstimatedPrice(ctx: any) {
    return 0;
  }

  public async onEvent(ctx: OnMessageContext | OnCallBackQueryData) {
    if (!this.isSupportedEvent(ctx)) {
      this.logger.warn(`### unsupported command ${ctx.message?.text}`);
      return false;
    }

    if (ctx.hasCommand(SupportedCommands.visit.name)) {
      this.onVistitCmd(ctx);
      return;
    }

    if (ctx.hasCommand(SupportedCommands.check.name)) {
      this.onCheckCmd(ctx);
      return;
    }

    if (ctx.hasCommand(SupportedCommands.register.name)) {
      this.onRegister(ctx);
      return;
    }

    if (this.hasPrefix(ctx.message?.text || "")) {
      this.onRegister(ctx);
      return;
    }

    if (ctx.hasCommand(SupportedCommands.nft.name)) {
      this.onNftCmd(ctx);
      return;
    }

    if (ctx.hasCommand(SupportedCommands.cert.name)) {
      this.onCertCmd(ctx);
      return;
    }

    // if (ctx.hasCommand(SupportedCommands.RENEW)) {
    //   this.onRenewCmd(ctx);
    //   return;
    // }

    // if (ctx.hasCommand(SupportedCommands.NOTION)) {
    //   this.onNotionCmd(ctx);
    //   return;
    // }

    // if (ctx.hasCommand(SupportedCommands.SUBDOMAIN)) {
    //   this.onEnableSubomain(ctx);
    //   return;
    // }

    this.logger.warn(`### unsupported command`);
    await ctx.reply("### unsupported command");
  }

  onVistitCmd = async (ctx: OnMessageContext | OnCallBackQueryData) => {
    if (!ctx.match) {
      await ctx.reply("Error: Missing 1.country domain");
      return;
    }

    const url = getUrl(ctx.match as string);
    let keyboard = new InlineKeyboard().webApp("Go", `https://${url}/`);

    await ctx.reply(`Visit ${url}`, {
      reply_markup: keyboard,
    });
  };

  onRenewCmd = async (ctx: OnMessageContext | OnCallBackQueryData) => {
    if (!ctx.match) {
      await ctx.reply("Error: Missing 1.country domain");
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

    await ctx.reply(`Renew ${url}`, {
      reply_markup: keyboard,
    });
  };

  onNotionCmd = async (ctx: OnMessageContext | OnCallBackQueryData) => {
    const prompt: any = ctx.match;
    if (!prompt) {
      ctx.reply("Error: Missing alias and url");
      return;
    }
    const [domain = "", alias = "", url = ""] = prompt.split(" ");
    if (domain && alias && url) {
      if (url.includes("notion") || url.includes("substack")) {
        let domainName = getUrl(domain, false);
        const isAvailable = await isDomainAvailable(domainName);
        if (!isAvailable.isAvailable) {
          let keyboard = new InlineKeyboard().webApp(
            "Process the Notion page Renew in 1.country",
            `https://${domainName}.country/?${alias}#=${url}`
          );
          await ctx.reply(`Renew ${url}`, {
            reply_markup: keyboard,
          });
        } else {
          await ctx.reply(`The domain doesn't exist`);
        }
      } else {
        await ctx.reply(`Invalid url`);
      }
    } else {
      await ctx.reply(appText.notion.promptMissing, {
        parse_mode: "Markdown",
      });
    }
  };

  onCertCmd = async (ctx: OnMessageContext | OnCallBackQueryData) => {
    if (await isAdmin(ctx, false, true)) {
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
          e instanceof AxiosError ? e.response?.data.error : appText.axiosError
        );
        ctx.reply(
          e instanceof AxiosError ? e.response?.data.error : appText.axiosError
        );
      }
    } else {
      await ctx.reply("This command is reserved");
    }
  };

  onNftCmd = async (ctx: OnMessageContext | OnCallBackQueryData) => {
    const url = getUrl(ctx.match as string);
    if (await isAdmin(ctx, false, true)) {
      try {
        const response = await relayApi().genNFT({ domain: url });
        await ctx.reply("NFT metadata generated");
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
    } else {
      await ctx.reply("This command is reserved");
    }
  };

  onCheckCmd = async (ctx: OnMessageContext | OnCallBackQueryData) => {
    if (await isAdmin(ctx, false, true)) {
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
      await ctx.reply(msg, {
        parse_mode: "Markdown",
      });
    } else {
      await ctx.reply("This command is reserved");
    }
  };

  async onRegister(ctx: OnMessageContext | OnCallBackQueryData) {
    const { prompt } = getCommandNamePrompt(ctx, SupportedCommands);
    const lastDomain = ctx.session.oneCountry.lastDomain;
    let msgId = 0;
    if (!prompt && !lastDomain) {
      await ctx.reply(`Write a domain name`);
      return;
    }
    if (!prompt && lastDomain) {
      let keyboard = new InlineKeyboard().webApp(
        "Rent in 1.country",
        `${config.country.hostname}?domain=${lastDomain}`
      );
      await ctx.reply(`Rent ${lastDomain}`, {
        reply_markup: keyboard,
      });
      return;
    }
    let domain = this.cleanInput(
      this.hasPrefix(prompt) ? prompt.slice(1) : prompt
    );
    const validate = validateDomainName(domain);
    if (!validate.valid) {
      await ctx.reply(validate.error, {
        parse_mode: "Markdown",
      });
      return;
    }
    ctx.session.oneCountry.lastDomain = domain;
    msgId = (await ctx.reply("Checking name...")).message_id;
    const response = await isDomainAvailable(domain);
    const domainAvailable = response.isAvailable;
    let msg = `The name *${domain}* `;
    if (!domainAvailable && response.isInGracePeriod) {
      msg += `is in grace period ❌. Only the owner is able to renew the domain`;
    } else if (!domainAvailable) {
      msg += `is unavailable ❌.\n${appText.registerKeepWriting}`;
    } else {
      msg += "is available ✅.\n";
      if (!response.priceUSD.error) {
        msg += `${response.priceOne} ONE = ${response.priceUSD.price} USD for 30 days\n`;
      } else {
        msg += `${response.priceOne} for 30 days\n`;
      }
      msg += `${appText.registerConfirmation}, or ${appText.registerKeepWriting}`;
    }
    await ctx.api.editMessageText(ctx.chat?.id!, msgId, msg, {
      parse_mode: "Markdown",
    });
  }

  onEnableSubomain = async (ctx: OnMessageContext) => {
    const {
      text,
      from: { id: userId, username },
    } = ctx.update.message;
    this.logger.info(`Message from ${username} (${userId}): "${text}"`);
    if (await isAdmin(ctx, false, true)) {
      let domain = this.cleanInput(ctx.match as string);
      domain = getUrl(domain, false);
      const isAvailable = await isDomainAvailable(domain);
      if (!isAvailable.isAvailable) {
        ctx.reply("Processing the request...");
        try {
          await relayApi().enableSubdomains(domain);
        } catch (e) {
          this.logger.error(
            e instanceof AxiosError
              ? e.response?.data
              : "There was an error processing your request"
          );
          await ctx.reply("There was an error processing your request");
        }
      }
    } else {
      await ctx.reply("This command is reserved");
    }
  };

  private cleanInput = (input: string) => {
    return input.replace(/[^a-z0-9-]/g, "").toLowerCase();
  };

  async onError(
    ctx: OnMessageContext | OnCallBackQueryData,
    e: any,
    retryCount: number = 3,
    msg?: string
  ) {
    if (retryCount === 0) {
      // Retry limit reached, log an error or take alternative action
      this.logger.error(`Retry limit reached for error: ${e}`);
      return;
    }
    if (e instanceof GrammyError) {
      if (e.error_code === 429) {
        this.botSuspended = true;
        const retryAfter = e.parameters.retry_after
          ? e.parameters.retry_after < 60
            ? 60
            : e.parameters.retry_after * 2
          : 60;
        const method = e.method;
        const errorMessage = `On method "${method}" | ${e.error_code} - ${e.description}`;
        this.logger.error(errorMessage);
        await ctx
          .reply(
            `${
              ctx.from.username ? ctx.from.username : ""
            } Bot has reached limit, wait ${retryAfter} seconds`
          )
          .catch((e) => this.onError(ctx, e, retryCount - 1));
        if (method === "editMessageText") {
          ctx.session.openAi.chatGpt.chatConversation.pop(); //deletes last prompt
        }
        await sleep(retryAfter * 1000); // wait retryAfter seconds to enable bot
        this.botSuspended = false;
      }
    } else {
      this.logger.error(`onChat: ${e.toString()}`);
      await ctx
        .reply(msg ? msg : "Error handling your request")
        .catch((e) => this.onError(ctx, e, retryCount - 1));
    }
  }
}
