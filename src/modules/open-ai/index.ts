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
import {
  alterGeneratedImg,
  getChatModel,
  getDalleModel,
  getDalleModelPrice,
  postGenerateImg,
  streamChatCompletion,
} from "./api/openAi";
import { appText } from "./utils/text";
import { chatService } from "../../database/services";
import { ChatGPTModelsEnum, ChatGptPayload } from "./types";
import config from "../../config";
import { sleep } from "../sd-images/utils";
import {
  getMessageExtras,
  getPromptPrice,
  hasChatPrefix,
  hasNewPrefix,
  hasPrefix,
  hasUrl,
  hasUsernamePassword,
  isMentioned,
  limitPrompt,
  MAX_TRIES,
  messageTopic,
  preparePrompt,
  sendMessage,
  SupportedCommands,
} from "./helpers";
import { getWebContent, getCrawlerPrice } from "./utils/web-crawler";

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

  public async isSupportedEvent(
    ctx: OnMessageContext | OnCallBackQueryData
  ): Promise<boolean> {
    const hasCommand = ctx.hasCommand(
      Object.values(SupportedCommands).map((command) => command.name)
    );
    if (isMentioned(ctx)) {
      return true;
    }
    const hasReply = this.isSupportedImageReply(ctx);
    const chatPrefix = hasPrefix(ctx.message?.text || "");
    if (chatPrefix !== "") {
      return true;
    }
    return hasCommand || hasReply;
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
    if (!this.isSupportedEvent(ctx) && ctx.chat?.type !== "private") {
      this.logger.warn(`### unsupported command ${ctx.message?.text}`);
      return false;
    }

    if (
      ctx.hasCommand(SupportedCommands.chat.name) ||
      (ctx.message?.text?.startsWith("chat ") && ctx.chat?.type === "private")
    ) {
      ctx.session.openAi.chatGpt.model = ChatGPTModelsEnum.GPT_4;
      await this.onChat(ctx);
      return;
    }

    if (
      ctx.hasCommand(SupportedCommands.new.name) ||
      (ctx.message?.text?.startsWith("new ") && ctx.chat?.type === "private")
    ) {
      ctx.session.openAi.chatGpt.model = ChatGPTModelsEnum.GPT_4;
      await this.onEnd(ctx);
      this.onChat(ctx);
      return;
    }

    if (
      ctx.hasCommand(SupportedCommands.ask.name) ||
      (ctx.message?.text?.startsWith("ask ") && ctx.chat?.type === "private")
    ) {
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
      ctx.session.openAi.chatGpt.model = ChatGPTModelsEnum.GPT_4;
      this.onChat(ctx);
      return;
    }

    if (ctx.hasCommand(SupportedCommands.gpt.name)) {
      ctx.session.openAi.chatGpt.model = ChatGPTModelsEnum.GPT_4;
      this.onChat(ctx);
      return;
    }
    if (
      ctx.hasCommand(SupportedCommands.dalle.name) ||
      ctx.hasCommand(SupportedCommands.dalleLC.name) ||
      (ctx.message?.text?.startsWith("dalle ") && ctx.chat?.type === "private")
    ) {
      this.onGenImgCmd(ctx);
      return;
    }

    // if (ctx.hasCommand(SupportedCommands.genImgEn.name)) {
    //   this.onGenImgEnCmd(ctx);
    //   return;
    // }

    if (this.isSupportedImageReply(ctx)) {
      this.onAlterImage(ctx);
      return;
    }

    if (
      ctx.hasCommand(SupportedCommands.sum.name) ||
      (ctx.message?.text?.startsWith("sum ") && ctx.chat?.type === "private")
    ) {
      this.onSum(ctx);
      return;
    }
    if (ctx.hasCommand(SupportedCommands.last.name)) {
      this.onLast(ctx);
      return;
    }

    if (hasNewPrefix(ctx.message?.text || "") !== "") {
      await this.onEnd(ctx);
      this.onPrefix(ctx);
      return;
    }

    if (hasChatPrefix(ctx.message?.text || "") !== "") {
      this.onPrefix(ctx);
      return;
    }

    if (isMentioned(ctx)) {
      this.onMention(ctx);
      return;
    }

    if (ctx.chat?.type === "private") {
      this.onPrivateChat(ctx);
      return;
    }

    this.logger.warn(`### unsupported command`);
    sendMessage(ctx, "### unsupported command", {
      topicId: ctx.message?.message_thread_id,
    }).catch((e) => this.onError(ctx, e, MAX_TRIES, "### unsupported command"));
  }

  private async hasBalance(ctx: OnMessageContext | OnCallBackQueryData) {
    const accountId = this.payments.getAccountId(ctx as OnMessageContext);
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
        let prompt = (ctx.match ? ctx.match : ctx.message?.text) as string;
        if (!prompt || prompt.split(" ").length === 1) {
          prompt = config.openAi.dalle.defaultPrompt;
        }
        ctx.chatAction = "upload_photo";
        const numImages = await ctx.session.openAi.imageGen.numImages;
        const imgSize = await ctx.session.openAi.imageGen.imgSize;
        const imgs = await postGenerateImg(prompt, numImages, imgSize);
        const msgExtras = getMessageExtras({
          caption: `/dalle ${prompt}`,
          topicId: await messageTopic(ctx),
        });
        imgs.map(async (img: any) => {
          await ctx.replyWithPhoto(img.url, msgExtras).catch((e) => {
            this.onError(ctx, e, MAX_TRIES);
          });
        });
      } else {
        sendMessage(ctx, "Bot disabled", {
          topicId: ctx.message?.message_thread_id,
        }).catch((e) => this.onError(ctx, e, MAX_TRIES, "Bot disabled"));
      }
    } catch (e) {
      this.onError(
        ctx,
        e,
        MAX_TRIES,
        "There was an error while generating the image"
      );
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
        const imgSize = await ctx.session.openAi.imageGen.imgSize;
        ctx.chatAction = "upload_photo";
        const imgs = await alterGeneratedImg(prompt!, filePath!, ctx, imgSize!);
        if (imgs) {
          imgs!.map(async (img: any) => {
            await ctx.replyWithPhoto(img.url).catch((e) => {
              throw e;
            });
          });
        }
        ctx.chatAction = null;
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

  private async promptGen(data: ChatGptPayload, chat: ChatConversation[]) {
    const { conversation, ctx, model } = data;
    try {
      const extras = getMessageExtras({
        topicId: ctx.message?.message_thread_id,
      });
      let msgId = (await ctx.reply("...", extras)).message_id;
      const isTypingEnabled = config.openAi.chatGpt.isTypingEnabled;
      if (isTypingEnabled) {
        ctx.chatAction = "typing";
      }
      const completion = await streamChatCompletion(
        conversation!,
        ctx,
        model,
        msgId,
        true // telegram messages has a character limit
      );
      if (isTypingEnabled) {
        ctx.chatAction = null;
      }
      if (completion) {
        const price = getPromptPrice(completion, data);
        this.logger.info(
          `streamChatCompletion result = tokens: ${
            price.promptTokens + price.completionTokens
          } | ${model} | price: ${price}¢`
        );
        conversation.push({ content: completion, role: "system" });
        chat = [...conversation!];
        return price.price;
      }
      return 0;
    } catch (e: any) {
      ctx.chatAction = null;
      throw e;
    }
  }

  async onSum(ctx: OnMessageContext | OnCallBackQueryData) {
    if (this.botSuspended) {
      sendMessage(ctx, "The bot is suspended", {
        topicId: ctx.message?.message_thread_id,
      }).catch((e) => this.onError(ctx, e));
      return;
    }
    try {
      const { prompt } = getCommandNamePrompt(ctx, SupportedCommands);
      const { url, newPrompt } = hasUrl(prompt);
      if (url) {
        let chat: ChatConversation[] = [];
        this.onWebCrawler(
          ctx,
          await preparePrompt(ctx, newPrompt),
          chat,
          url,
          "sum"
        );
      } else {
        await sendMessage(ctx, `Error: Missing url`, {
          topicId: ctx.message?.message_thread_id,
        }).catch((e) => this.onError(ctx, e));
      }
    } catch (e) {
      this.onError(ctx, e);
    }
  }

  private async onWebCrawler(
    ctx: OnMessageContext | OnCallBackQueryData,
    prompt: string,
    chat: ChatConversation[],
    url: string,
    command = "ask"
  ) {
    try {
      ctx.session.openAi.chatGpt.model = ChatGPTModelsEnum.GPT_35_TURBO_16K;
      const model = ChatGPTModelsEnum.GPT_35_TURBO_16K;
      // const { model } = ctx.session.openAi.chatGpt;
      const chatModel = getChatModel(model);
      const webCrawlerMaxTokens =
        chatModel.maxContextTokens - config.openAi.chatGpt.maxTokens * 2;
      const { user, password } = hasUsernamePassword(prompt);
      if (user && password) {
        // && ctx.chat?.type !== 'private'
        const maskedPrompt =
          ctx.message
            ?.text!.replaceAll(user, "****")
            .replaceAll(password, "*****") || "";
        ctx.api.deleteMessage(ctx.chat?.id!, ctx.message?.message_id!);
        sendMessage(ctx, maskedPrompt, {
          topicId: ctx.message?.message_thread_id,
        });
      }
      const webContent = await getWebContent(
        url,
        webCrawlerMaxTokens,
        user,
        password
      );
      if (webContent.urlText !== "") {
        // await sendMessage(ctx,`URL downloaded`,
        //           // `${(webContent.networkTraffic / 1048576).toFixed(
        //   //   2
        //   // )} MB in ${(webContent.elapsedTime / 1000).toFixed(2)} seconds`,
        // {
        //   topicId: ctx.message?.message_thread_id,
        //   parseMode: "Markdown",
        // }).catch((e) => this.onError(ctx, e));
        if (
          !(await this.payments.pay(ctx as OnMessageContext, webContent.fees))
        ) {
          this.onNotBalanceMessage(ctx);
        } else {
          let newPrompt = "";
          if (prompt !== "") {
            newPrompt = `${command === "sum" && "Summarize"} ${limitPrompt(
              prompt
            )} this text: ${webContent.urlText}`;
          } else {
            newPrompt = `Summarize this text in ${config.openAi.chatGpt.wordLimit} words:
            } "${webContent.urlText}"`;
          }
          chat.push({
            content: newPrompt,
            role: "user",
          });
          const payload = {
            conversation: chat,
            model: model || config.openAi.chatGpt.model,
            ctx,
          };
          const price = await this.promptGen(payload, chat);
          if (!(await this.payments.pay(ctx as OnMessageContext, price))) {
            this.onNotBalanceMessage(ctx);
          }
        }
      } else {
        await sendMessage(
          ctx,
          "Url not supported, incorrect web site address or missing user credentials",
          {
            topicId: ctx.message?.message_thread_id,
            parseMode: "Markdown",
          }
        ).catch((e) => this.onError(ctx, e));
        return;
      }
      return {
        text: webContent.urlText,
        bytes: webContent.networkTraffic,
        time: webContent.elapsedTime,
        fees: await getCrawlerPrice(webContent.networkTraffic),
        oneFees: 0.5,
      };
    } catch (e) {
      this.onError(ctx, e);
    }
  }

  async onMention(ctx: OnMessageContext | OnCallBackQueryData) {
    try {
      if (this.botSuspended) {
        sendMessage(ctx, "The bot is suspended", {
          topicId: ctx.message?.message_thread_id,
        }).catch((e) => this.onError(ctx, e));
        return;
      }
      const { username } = ctx.me;
      const prompt = ctx.message?.text?.slice(username.length + 1) || ""; //@
      ctx.session.openAi.chatGpt.requestQueue.push(
        await preparePrompt(ctx, prompt)
      );
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
        sendMessage(ctx, "The bot is suspended", {
          topicId: ctx.message?.message_thread_id,
        }).catch((e) => this.onError(ctx, e));
        return;
      }
      const { prompt, commandName } = getCommandNamePrompt(
        ctx,
        SupportedCommands
      );
      const prefix = hasPrefix(prompt);
      ctx.session.openAi.chatGpt.requestQueue.push(
        await preparePrompt(ctx, prompt.slice(prefix.length))
      );
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

  async onPrivateChat(ctx: OnMessageContext | OnCallBackQueryData) {
    try {
      if (this.botSuspended) {
        sendMessage(ctx, "The bot is suspended", {
          topicId: ctx.message?.message_thread_id,
        }).catch((e) => this.onError(ctx, e));
        return;
      }
      ctx.session.openAi.chatGpt.requestQueue.push(
        await preparePrompt(ctx, ctx.message?.text!)
      );
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
        sendMessage(ctx, "The bot is suspended", {
          topicId: ctx.message?.message_thread_id,
        }).catch((e) => this.onError(ctx, e));
        return;
      }
      const prompt = ctx.match ? ctx.match : ctx.message?.text;
      ctx.session.openAi.chatGpt.requestQueue.push(
        await preparePrompt(ctx, prompt as string)
      );
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
            await sendMessage(ctx, msg, {
              topicId: ctx.message?.message_thread_id,
              parseMode: "Markdown",
            }).catch((e) => this.onError(ctx, e));
            return;
          }
          const { url, newPrompt } = hasUrl(prompt);
          if (url) {
            await this.onWebCrawler(
              ctx,
              newPrompt,
              chatConversation,
              url,
              "ask"
            );
          } else {
            const newPrompt = chatConversation.push({
              role: "user",
              content: limitPrompt(prompt),
            });
            const payload = {
              conversation: chatConversation!,
              model: model || config.openAi.chatGpt.model,
              ctx,
            };
            const price = await this.promptGen(payload, chatConversation);
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
      await sendMessage(
        ctx,
        `${appText.gptLast}\n_${chat[chat.length - 1].content}_`,
        {
          topicId: ctx.message?.message_thread_id,
          parseMode: "Markdown",
        }
      ).catch((e) => this.onError(ctx, e));
    } else {
      await sendMessage(ctx, `To start a conversation please write */ask*`, {
        topicId: ctx.message?.message_thread_id,
        parseMode: "Markdown",
      }).catch((e) => this.onError(ctx, e));
    }
  }

  async onEnd(ctx: OnMessageContext | OnCallBackQueryData) {
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
    await sendMessage(ctx, balanceMessage, {
      topicId: ctx.message?.message_thread_id,
      parseMode: "Markdown",
    }).catch((e) => this.onError(ctx, e));
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
      if (e.error_code === 400 && e.description.includes("not enough rights")) {
        await sendMessage(
          ctx,
          "Error: The bot does not have permission to send photos in chat",
          {
            topicId: ctx.message?.message_thread_id,
          }
        );
      } else if (e.error_code === 429) {
        this.botSuspended = true;
        const retryAfter = e.parameters.retry_after
          ? e.parameters.retry_after < 60
            ? 60
            : e.parameters.retry_after * 2
          : 60;
        const method = e.method;
        const errorMessage = `On method "${method}" | ${e.error_code} - ${e.description}`;
        this.logger.error(errorMessage);
        await sendMessage(
          ctx,
          `${
            ctx.from.username ? ctx.from.username : ""
          } Bot has reached limit, wait ${retryAfter} seconds`,
          {
            topicId: ctx.message?.message_thread_id,
          }
        ).catch((e) => this.onError(ctx, e, retryCount - 1));
        if (method === "editMessageText") {
          ctx.session.openAi.chatGpt.chatConversation.pop(); //deletes last prompt
        }
        await sleep(retryAfter * 1000); // wait retryAfter seconds to enable bot
        this.botSuspended = false;
      } else {
        this.logger.error(
          `On method "${e.method}" | ${e.error_code} - ${e.description}`
        );
      }
    } else if (e instanceof OpenAI.APIError) {
      // 429	RateLimitError
      // e.status = 400 || e.code = BadRequestError
      this.logger.error(`OPENAI Error ${e.status}(${e.code}) - ${e.message}`);
      if (e.code === "context_length_exceeded") {
        await sendMessage(ctx, e.message, {
          topicId: ctx.message?.message_thread_id,
        }).catch((e) => this.onError(ctx, e, retryCount - 1));
        this.onEnd(ctx);
      } else {
        await sendMessage(
          ctx,
          `Error accessing OpenAI (ChatGPT). Please try later`,
          {
            topicId: ctx.message?.message_thread_id,
          }
        ).catch((e) => this.onError(ctx, e, retryCount - 1));
      }
    } else {
      this.logger.error(`${e.toString()}`);
      await sendMessage(ctx, "Error handling your request", {
        topicId: ctx.message?.message_thread_id,
      }).catch((e) => this.onError(ctx, e, retryCount - 1));
    }
  }
}

// onGenImgEnCmd = async (ctx: OnMessageContext | OnCallBackQueryData) => {
//   try {
//     if (ctx.session.openAi.imageGen.isEnabled) {
//       const prompt = await ctx.match;
//       if (!prompt) {
//         sendMessage(ctx, "Error: Missing prompt", {
//           topicId: ctx.message?.message_thread_id,
//         }).catch((e) =>
//           this.onError(ctx, e, MAX_TRIES, "Error: Missing prompt")
//         );
//         return;
//       }
//       const payload = {
//         chatId: await ctx.chat?.id!,
//         prompt: prompt as string,
//         numImages: await ctx.session.openAi.imageGen.numImages,
//         imgSize: await ctx.session.openAi.imageGen.imgSize,
//       };
//       sendMessage(ctx, "generating improved prompt...", {
//         topicId: ctx.message?.message_thread_id,
//       }).catch((e) =>
//         this.onError(ctx, e, MAX_TRIES, "generating improved prompt...")
//       );
//       await imgGenEnhanced(payload, ctx);
//     } else {
//       sendMessage(ctx, "Bot disabled", {
//         topicId: ctx.message?.message_thread_id,
//       }).catch((e) => this.onError(ctx, e, MAX_TRIES, "Bot disabled"));
//     }
//   } catch (e) {
//     this.onError(ctx, e);
//   }
// };

// private async imgGenEnhanced(
//   data: ImageGenPayload,
//   ctx: OnMessageContext | OnCallBackQueryData
// ) {
//   const { chatId, prompt, numImages, imgSize, model } = data;
//   try {
//     const upgratedPrompt = await improvePrompt(prompt, model!);
//     if (upgratedPrompt) {
//       await ctx
//         .reply(
//           `The following description was added to your prompt: ${upgratedPrompt}`
//         )
//         .catch((e) => {
//           throw e;
//         });
//     }
//     // bot.api.sendMessage(chatId, "generating the output...");
//     const imgs = await postGenerateImg(
//       upgratedPrompt || prompt,
//       numImages,
//       imgSize
//     );
//     imgs.map(async (img: any) => {
//       await ctx
//         .replyWithPhoto(img.url, {
//           caption: `/DALLE ${upgratedPrompt || prompt}`,
//         })
//         .catch((e) => {
//           throw e;
//         });
//     });
//     return true;
//   } catch (e) {
//     throw e;
//   }
// };
