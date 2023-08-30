import { GrammyError } from "grammy";
import OpenAI from "openai";
import { Logger, pino } from "pino";

import { getCommandNamePrompt } from "../1country/utils";
import { BotPayments } from "../payment";
import {
  OnMessageContext,
  OnCallBackQueryData,
  ChatConversation,
} from "../types";
import { getChatModel, getDalleModel, getDalleModelPrice } from "./api/openAi";
import { alterImg, imgGen, imgGenEnhanced, promptGen } from "./controller";
import { appText } from "./utils/text";
import { chatService } from "../../database/services";
import { ChatGPTModelsEnum } from "./types";
import { askTemplates } from "../../constants";
import config from "../../config";
import { sleep } from "../sd-images/utils";
import {
  isValidUrl,
  getWebContent,
  getCrawlerPrice,
} from "./utils/web-crawler";

export const SupportedCommands = {
  chat: {
    name: "chat",
    groupParams: ">0",
    privateParams: ">0",
  },
  ask: {
    name: "ask",
    groupParams: ">0",
    privateParams: ">0",
  },
  sum: {
    name: "sum",
    groupParams: ">0",
    privateParams: ">0",
  },
  ask35: {
    name: "ask35",
    groupParams: ">0",
    privateParams: ">0",
  },
  gpt4: {
    name: "gpt4",
    groupParams: ">0",
    privateParams: ">0",
  },
  gpt: {
    name: "gpt",
    groupParams: ">0",
    privateParams: ">0",
  },
  last: {
    name: "last",
    groupParams: ">0",
    privateParams: ">0",
  },
  dalle: {
    name: "DALLE",
    groupParams: ">0",
    privateParams: ">0",
  },
  dalleLC: {
    name: "dalle",
    groupParams: ">0",
    privateParams: ">0",
  },
  genImgEn: {
    name: "genImgEn",
    groupParams: ">1",
    privateParams: ">1",
  },
  end: {
    name: "stop",
    groupParams: ">0",
    privateParams: ">0",
  },
};

const MAX_TRIES = 3;

// const payments = new BotPayments();
export class OpenAIBot {
  private logger: Logger;
  private payments: BotPayments;
  private botSuspended: boolean;

  constructor(payments: BotPayments) {
    this.logger = pino({
      name: "OpenAIBot",
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
        },
      },
    });
    this.botSuspended = false;
    this.payments = payments;
    if (!config.openAi.dalle.isEnabled) {
      this.logger.warn("DALL·E 2 Image Bot is disabled in config");
    }
  }

  private isMentioned(ctx: OnMessageContext | OnCallBackQueryData): boolean {
    if (ctx.entities()[0]) {
      const { offset, text } = ctx.entities()[0];
      const { username } = ctx.me;
      if (username === text.slice(1) && offset === 0) {
        const prompt = ctx.message?.text!.slice(text.length);
        if (prompt && prompt.split(" ").length > 0) {
          return true;
        }
      }
    }
    return false;
  }

  public isSupportedEvent(
    ctx: OnMessageContext | OnCallBackQueryData
  ): boolean {
    const hasCommand = ctx.hasCommand(
      Object.values(SupportedCommands).map((command) => command.name)
    );
    if (this.isMentioned(ctx)) {
      return true;
    }
    const hasReply = this.isSupportedImageReply(ctx);
    const chatPrefix = this.hasPrefix(ctx.message?.text || "");
    if (chatPrefix !== "") {
      return true;
    }
    return hasCommand || hasReply;
  }

  private hasPrefix(prompt: string): string {
    const prefixList = config.openAi.chatGpt.chatPrefix;
    for (let i = 0; i < prefixList.length; i++) {
      if (prompt.toLocaleLowerCase().startsWith(prefixList[i])) {
        return prefixList[i];
      }
    }
    return "";
  }

  private hasUrl(prompt: string) {
    const promptArray = prompt.split(" ");
    let url = "";
    let pos = 0;
    for (let i = 0; i < promptArray.length; i++) {
      if (isValidUrl(promptArray[i])) {
        url = promptArray[i];
        promptArray.splice(i, 1);
        break;
      }
    }
    return {
      url,
      newPrompt: promptArray.join(" "),
    };
  }

  public getEstimatedPrice(ctx: any): number {
    try {
      const priceAdjustment = config.openAi.chatGpt.priceAdjustment;
      const prompts = ctx.match;
      if (this.isSupportedImageReply(ctx)) {
        const imageNumber = ctx.message?.caption || ctx.message?.text;
        const imageSize = ctx.session.openAi.imageGen.imgSize;
        const model = getDalleModel(imageSize);
        const price = getDalleModelPrice(model, true, imageNumber); //cents
        return price * priceAdjustment;
      }
      if (!prompts) {
        return 0;
      }
      if (
        ctx.hasCommand(SupportedCommands.dalle.name) ||
        ctx.hasCommand(SupportedCommands.dalleLC.name)
      ) {
        const imageNumber = ctx.session.openAi.imageGen.numImages;
        const imageSize = ctx.session.openAi.imageGen.imgSize;
        const model = getDalleModel(imageSize);
        const price = getDalleModelPrice(model, true, imageNumber); //cents
        return price * priceAdjustment;
      }
      if (ctx.hasCommand(SupportedCommands.genImgEn.name)) {
        const imageNumber = ctx.session.openAi.imageGen.numImages;
        const imageSize = ctx.session.openAi.imageGen.imgSize;
        const chatModelName = ctx.session.openAi.chatGpt.model;
        const chatModel = getChatModel(chatModelName);
        const model = getDalleModel(imageSize);
        const price = getDalleModelPrice(
          model,
          true,
          imageNumber,
          true,
          chatModel
        ); //cents
        return price * priceAdjustment;
      }
      return 0;
    } catch (e) {
      this.logger.error(`getEstimatedPrice error ${e}`);
      throw e;
    }
  }

  isSupportedImageReply(ctx: OnMessageContext | OnCallBackQueryData) {
    const photo = ctx.message?.photo || ctx.message?.reply_to_message?.photo;
    if (photo && ctx.session.openAi.imageGen.isEnabled) {
      const prompt = ctx.message?.caption || ctx.message?.text;
      if (prompt && !isNaN(+prompt)) {
        return true;
      }
    }
    return false;
  }

  public async onEvent(ctx: OnMessageContext | OnCallBackQueryData) {
    if (!this.isSupportedEvent(ctx)) {
      this.logger.warn(`### unsupported command ${ctx.message?.text}`);
      return false;
    }

    if (ctx.hasCommand(SupportedCommands.chat.name)) {
      await this.onChat(ctx);
      return;
    }

    // if (ctx.message!.text === "/ask harmony.one/dear") {
    //   await ctx.reply(askTemplates.dear).catch((e) => this.onError(ctx, e));
    //   return;
    // }

    if (ctx.hasCommand(SupportedCommands.ask.name)) {
      ctx.session.openAi.chatGpt.model = ChatGPTModelsEnum.GPT_4;
      this.onChat(ctx);
      return;
    }

    if (ctx.hasCommand(SupportedCommands.ask35.name)) {
      ctx.session.openAi.chatGpt.model = ChatGPTModelsEnum.GPT_35_TURBO_16K;
      this.onChat(ctx);
      return;
    }

    if (ctx.hasCommand(SupportedCommands.gpt4.name)) {
      this.onChat(ctx);
      return;
    }

    if (ctx.hasCommand(SupportedCommands.gpt.name)) {
      this.onChat(ctx);
      return;
    }

    if (
      ctx.hasCommand(SupportedCommands.dalle.name) ||
      ctx.hasCommand(SupportedCommands.dalleLC.name)
    ) {
      this.onGenImgCmd(ctx);
      return;
    }

    if (ctx.hasCommand(SupportedCommands.genImgEn.name)) {
      this.onGenImgEnCmd(ctx);
      return;
    }

    if (this.isSupportedImageReply(ctx)) {
      this.onAlterImage(ctx);
      return;
    }

    if (ctx.hasCommand(SupportedCommands.sum.name)) {
      this.onSum(ctx);
      return;
    }

    if (ctx.hasCommand(SupportedCommands.end.name)) {
      this.onEnd(ctx);
      return;
    }

    if (ctx.hasCommand(SupportedCommands.last.name)) {
      this.onLast(ctx);
      return;
    }

    if (this.hasPrefix(ctx.message?.text || "") !== "") {
      this.onPrefix(ctx);
      return;
    }

    if (this.isMentioned(ctx)) {
      this.onMention(ctx);
      return;
    }

    this.logger.warn(`### unsupported command`);
    await ctx
      .reply("### unsupported command")
      .catch((e) => this.onError(ctx, e, MAX_TRIES, "Bot disabled"));
  }

  private async hasBalance(ctx: OnMessageContext | OnCallBackQueryData) {
    const accountId = this.payments.getAccountId(ctx as OnMessageContext);
    const account = await this.payments.getUserAccount(accountId);
    const addressBalance = await this.payments.getUserBalance(accountId);
    const creditsBalance = await chatService.getBalance(accountId);
    const balance = addressBalance.plus(creditsBalance);
    const balanceOne = (await this.payments.toONE(balance, false)).toFixed(2);
    return (
      +balanceOne > +config.openAi.chatGpt.minimumBalance ||
      (await this.payments.isUserInWhitelist(ctx.from.id, ctx.from.username))
    );
  }

  onGenImgCmd = async (ctx: OnMessageContext | OnCallBackQueryData) => {
    try {
      if (ctx.session.openAi.imageGen.isEnabled) {
        let prompt = ctx.match;
        if (!prompt) {
          prompt = config.openAi.dalle.defaultPrompt;
        }
        ctx.chatAction = "upload_photo";
        const payload = {
          chatId: ctx.chat?.id!,
          prompt: prompt as string,
          numImages: await ctx.session.openAi.imageGen.numImages, // lazy load
          imgSize: await ctx.session.openAi.imageGen.imgSize, // lazy load
        };
        await imgGen(payload, ctx);
      } else {
        await ctx
          .reply("Bot disabled")
          .catch((e) => this.onError(ctx, e, MAX_TRIES, "Bot disabled"));
      }
    } catch (e) {
      this.onError(ctx, e, 3, "There was an error while generating the image");
    }
  };

  onGenImgEnCmd = async (ctx: OnMessageContext | OnCallBackQueryData) => {
    try {
      if (ctx.session.openAi.imageGen.isEnabled) {
        const prompt = await ctx.match;
        if (!prompt) {
          await ctx
            .reply("Error: Missing prompt")
            .catch((e) =>
              this.onError(ctx, e, MAX_TRIES, "Error: Missing prompt")
            );
          return;
        }
        const payload = {
          chatId: await ctx.chat?.id!,
          prompt: prompt as string,
          numImages: await ctx.session.openAi.imageGen.numImages,
          imgSize: await ctx.session.openAi.imageGen.imgSize,
        };
        await ctx
          .reply("generating improved prompt...")
          .catch((e) => this.onError(ctx, e));
        await imgGenEnhanced(payload, ctx);
      } else {
        await ctx
          .reply("Bot disabled")
          .catch((e) => this.onError(ctx, e, MAX_TRIES, "Bot disabled"));
      }
    } catch (e) {
      this.onError(ctx, e);
    }
  };

  onAlterImage = async (ctx: OnMessageContext | OnCallBackQueryData) => {
    try {
      if (ctx.session.openAi.imageGen.isEnabled) {
        const photo =
          ctx.message?.photo || ctx.message?.reply_to_message?.photo;
        const prompt = ctx.message?.caption || ctx.message?.text;
        const file_id = photo?.pop()?.file_id; // with pop() get full image quality
        const file = await ctx.api.getFile(file_id!);
        const filePath = `${config.openAi.dalle.telegramFileUrl}${config.telegramBotAuthToken}/${file.file_path}`;
        const payload = {
          chatId: ctx.chat?.id!,
          prompt: prompt as string,
          numImages: await ctx.session.openAi.imageGen.numImages,
          imgSize: await ctx.session.openAi.imageGen.imgSize,
          filePath: filePath,
        };
        await alterImg(payload, ctx);
      }
    } catch (e: any) {
      this.onError(
        ctx,
        e,
        MAX_TRIES,
        "An error occurred while generating the AI edit"
      );
    }
  };

  async onSum(ctx: OnMessageContext | OnCallBackQueryData) {
    if (this.botSuspended) {
      await ctx
        .reply("The bot is suspended")
        .catch((e) => this.onError(ctx, e));
      return;
    }
    try {
      const { prompt } = getCommandNamePrompt(ctx, SupportedCommands);
      const { url, newPrompt } = this.hasUrl(prompt);
      if (url) {
        let chat: ChatConversation[] = [];
        this.onWebCrawler(ctx, newPrompt, chat, url, "sum");
      } else {
        ctx.reply(`Error: Missing url`);
      }
    } catch (e) {}
  }

  private async onWebCrawler(
    ctx: OnMessageContext | OnCallBackQueryData,
    prompt: string,
    chat: ChatConversation[],
    url: string,
    command = "ask"
  ) {
    try {
      const { model } = ctx.session.openAi.chatGpt;

      const chatModel = getChatModel(model);
      const webCrawlerMaxTokens =
        chatModel.maxContextTokens - config.openAi.maxTokens;
      const webContent = await getWebContent(url, webCrawlerMaxTokens);
      if (webContent.urlText !== "") {
        // ctx.reply(`URL downloaded`,
        //   // `${(webContent.networkTraffic / 1048576).toFixed(
        //   //   2
        //   // )} MB in ${(webContent.elapsedTime / 1000).toFixed(2)} seconds`,
        //   {
        //     parse_mode: "Markdown",
        //   }
        // );
        if (
          !(await this.payments.pay(ctx as OnMessageContext, webContent.fees))
        ) {
          this.onNotBalanceMessage(ctx);
        } else {
          if (prompt !== "") {
            chat.push({
              content: `${
                command === "sum" && "Summarize"
              } ${prompt} this text: ${webContent.urlText}`,
              role: "user",
            });
          } else {
            chat.push({
              content: `${command === "sum" && "Summarize this text in 50 words:"} ${
                webContent.urlText
              }`,
              role: "user",
            });
          }

          if (prompt || command === "sum") {
            const payload = {
              conversation: chat,
              model: model || config.openAi.chatGpt.model,
              ctx,
            };
            const price = await promptGen(payload, chat);
            if (!(await this.payments.pay(ctx as OnMessageContext, price))) {
              this.onNotBalanceMessage(ctx);
            }
          }
        }
      } else {
        ctx.reply("Url not supported or incorrect web site address");
      }
      return {
        text: webContent.urlText,
        bytes: webContent.networkTraffic,
        time: webContent.elapsedTime,
        fees: await getCrawlerPrice(webContent.networkTraffic),
        oneFees: 0.5,
      };
    } catch (e) {
      throw e;
    }
  }

  async onMention(ctx: OnMessageContext | OnCallBackQueryData) {
    try {
      if (this.botSuspended) {
        await ctx
          .reply("The bot is suspended")
          .catch((e) => this.onError(ctx, e));
        return;
      }
      const { username } = ctx.me;
      const prompt = ctx.message?.text?.slice(username.length + 1) || ""; //@
      ctx.session.openAi.chatGpt.requestQueue.push(prompt);
      if (!ctx.session.openAi.chatGpt.isProcessingQueue) {
        ctx.session.openAi.chatGpt.isProcessingQueue = true;
        this.onChatRequestHandler(ctx).then(() => {
          ctx.session.openAi.chatGpt.isProcessingQueue = false;
        });
      }
    } catch (e) {
      this.onError(ctx, e);
    }
  }

  async onPrefix(ctx: OnMessageContext | OnCallBackQueryData) {
    try {
      if (this.botSuspended) {
        await ctx
          .reply("The bot is suspended")
          .catch((e) => this.onError(ctx, e));
        return;
      }
      const { prompt, commandName } = getCommandNamePrompt(
        ctx,
        SupportedCommands
      );
      const prefix = this.hasPrefix(prompt);
      ctx.session.openAi.chatGpt.requestQueue.push(prompt.slice(prefix.length));
      if (!ctx.session.openAi.chatGpt.isProcessingQueue) {
        ctx.session.openAi.chatGpt.isProcessingQueue = true;
        this.onChatRequestHandler(ctx).then(() => {
          ctx.session.openAi.chatGpt.isProcessingQueue = false;
        });
      }
    } catch (e) {
      this.onError(ctx, e);
    }
  }

  async onChat(ctx: OnMessageContext | OnCallBackQueryData) {
    try {
      if (this.botSuspended) {
        await ctx
          .reply("The bot is suspended")
          .catch((e) => this.onError(ctx, e));
        return;
      }
      ctx.session.openAi.chatGpt.requestQueue.push(ctx.match as string);
      if (!ctx.session.openAi.chatGpt.isProcessingQueue) {
        ctx.session.openAi.chatGpt.isProcessingQueue = true;
        this.onChatRequestHandler(ctx).then(() => {
          ctx.session.openAi.chatGpt.isProcessingQueue = false;
        });
      }
    } catch (e: any) {
      this.onError(ctx, e);
    }
  }

  async onChatRequestHandler(ctx: OnMessageContext | OnCallBackQueryData) {
    while (ctx.session.openAi.chatGpt.requestQueue.length > 0) {
      try {
        const prompt = ctx.session.openAi.chatGpt.requestQueue.shift() || "";
        const { chatConversation, model } = ctx.session.openAi.chatGpt;
        if (await this.hasBalance(ctx)) {
          if (prompt === "") {
            const msg =
              chatConversation.length > 0
                ? `${appText.gptLast}\n_${
                    chatConversation[chatConversation.length - 1].content
                  }_`
                : appText.introText;
            await ctx
              .reply(msg, { parse_mode: "Markdown" })
              .catch((e) => this.onError(ctx, e));
            return;
          }
          const { url, newPrompt } = this.hasUrl(prompt);
          if (url) {
            await this.onWebCrawler(
              ctx,
              newPrompt,
              chatConversation,
              url,
              "ask"
            );
          } else {
            chatConversation.push({
              role: "user",
              content: prompt,
            });
            const payload = {
              conversation: chatConversation!,
              model: model || config.openAi.chatGpt.model,
              ctx,
            };
            const price = await promptGen(payload, chatConversation);
            if (!(await this.payments.pay(ctx as OnMessageContext, price))) {
              this.onNotBalanceMessage(ctx);
            }
          }
          ctx.chatAction = null;
        } else {
          this.onNotBalanceMessage(ctx);
        }
      } catch (e: any) {
        this.onError(ctx, e);
      }
    }
  }

  async onLast(ctx: OnMessageContext | OnCallBackQueryData) {
    if (ctx.session.openAi.chatGpt.chatConversation.length > 0) {
      const chat = ctx.session.openAi.chatGpt.chatConversation;
      await ctx
        .reply(`${appText.gptLast}\n_${chat[chat.length - 1].content}_`, {
          parse_mode: "Markdown",
        })
        .catch((e) => this.onError(ctx, e));
    } else {
      await ctx
        .reply(`To start a conversation please write */ask*`, {
          parse_mode: "Markdown",
        })
        .catch((e) => this.onError(ctx, e));
    }
  }

  async onEnd(ctx: OnMessageContext | OnCallBackQueryData) {
    this.logger.info("/stop command");
    ctx.session.openAi.chatGpt.chatConversation = [];
    ctx.session.openAi.chatGpt.usage = 0;
    ctx.session.openAi.chatGpt.price = 0;
  }

  async onNotBalanceMessage(ctx: OnMessageContext | OnCallBackQueryData) {
    const accountId = this.payments.getAccountId(ctx as OnMessageContext);
    const account = await this.payments.getUserAccount(accountId);
    const addressBalance = await this.payments.getUserBalance(accountId);
    const creditsBalance = await chatService.getBalance(accountId);
    const balance = addressBalance.plus(creditsBalance);
    const balanceOne = (await this.payments.toONE(balance, false)).toFixed(2);
    const balanceMessage = appText.notEnoughBalance
      .replaceAll("$CREDITS", balanceOne)
      .replaceAll("$WALLET_ADDRESS", account?.address || "");
    await ctx
      .reply(balanceMessage, { parse_mode: "Markdown" })
      .catch((e) => this.onError(ctx, e));
  }

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
    } else if (e instanceof OpenAI.APIError) {
      // 429	RateLimitError
      // e.status = 400 || e.code = BadRequestError
      this.logger.error(`OPENAI Error ${e.status}(${e.code}) - ${e.message}`);
      if (e.code === "context_length_exceeded") {
        await ctx
          .reply(`${e.message}`)
          .catch((e) => this.onError(ctx, e, retryCount - 1));
        this.onEnd(ctx);
      } else {
        await ctx
          .reply(`Error accessing OpenAI (ChatGPT). Please try later`)
          .catch((e) => this.onError(ctx, e, retryCount - 1));
      }
    } else {
      this.logger.error(`onChat: ${e.toString()}`);
      await ctx
        .reply(msg ? msg : "Error handling your request")
        .catch((e) => this.onError(ctx, e, retryCount - 1));
    }
  }
}
