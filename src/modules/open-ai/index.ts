import config from "../../config";
import { OnMessageContext, OnCallBackQueryData } from "../types";
import { getChatModel, getDalleModel, getDalleModelPrice } from "./api/openAi";
import { alterImg, imgGen, imgGenEnhanced } from "./controller";
import { Logger, pino } from "pino";

enum SupportedCommands {
  GEN_IMG = "genImg",
  GEN_IMG_EN = "genImgEn",
}

export class OpenAIBot {
  private logger: Logger;

  constructor() {
    this.logger = pino({
      name: "OpenAIBot",
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
        },
      },
    });
    if (!config.openAi.imageGen.isEnabled) {
      this.logger.warn("DALL·E 2 Image Bot is disabled in config");
    }
  }

  public isSupportedEvent(
    ctx: OnMessageContext | OnCallBackQueryData
  ): boolean {
    const hasCommand = ctx.hasCommand(Object.values(SupportedCommands));
    const hasRepply = this.isSupportedImageReply(ctx);

    if (hasCommand && !ctx.match) {
      ctx.reply("Error: Missing prompt");
      return false;
    }
    return hasCommand || hasRepply;
  }

  public getEstimatedPrice(ctx: any) {
    const prompts = ctx.match;
    if (this.isSupportedImageReply(ctx)) {
      const imageNumber = ctx.message?.caption || ctx.message?.text;
      const imageSize = ctx.session.openAi.imageGen.imgSize;
      const model = getDalleModel(imageSize);
      const price = getDalleModelPrice(model, true, imageNumber); //cents
      return price;
    }
    if (!prompts) {
      return 0;
    }
    if (ctx.hasCommand("genImg")) {
      const imageNumber = ctx.session.openAi.imageGen.numImages;
      const imageSize = ctx.session.openAi.imageGen.imgSize;
      const model = getDalleModel(imageSize);
      const price = getDalleModelPrice(model, true, imageNumber); //cents
      return price;
    }
    if (ctx.hasCommand("genImgEn")) {
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
      return price;
    }
    return 0;
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
      console.log(`### unsupported command ${ctx.message?.text}`);
      return false;
    }

    if (ctx.hasCommand(SupportedCommands.GEN_IMG)) {
      this.onGenImgCmd(ctx);
      return;
    }

    if (ctx.hasCommand(SupportedCommands.GEN_IMG_EN)) {
      this.onGenImgEnCmd(ctx);
      return;
    }

    if (this.isSupportedImageReply(ctx)) {
      this.onAlterImage(ctx);
      return;
    }

    console.log(`### unsupported command`);
    ctx.reply("### unsupported command");
  }

  onGenImgCmd = async (ctx: OnMessageContext | OnCallBackQueryData) => {
    if (ctx.session.openAi.imageGen.isEnabled) {
      const prompt = ctx.match;
      if (!prompt) {
        ctx.reply("Error: Missing prompt");
        return;
      }
      const payload = {
        chatId: ctx.chat?.id!,
        prompt: ctx.match as string,
        numImages: await ctx.session.openAi.imageGen.numImages, // lazy load
        imgSize: await ctx.session.openAi.imageGen.imgSize, // lazy load
      };
      await imgGen(payload);
    } else {
      ctx.reply("Bot disabled");
    }
  };

  onGenImgEnCmd = async (ctx: OnMessageContext | OnCallBackQueryData) => {
    if (ctx.session.openAi.imageGen.isEnabled) {
      const prompt = ctx.match;
      if (!prompt) {
        ctx.reply("Error: Missing prompt");
        return;
      }
      const payload = {
        chatId: ctx.chat?.id!,
        prompt: ctx.match as string,
        numImages: await ctx.session.openAi.imageGen.numImages,
        imgSize: await ctx.session.openAi.imageGen.imgSize,
      };
      ctx.reply("generating improved prompt...");
      await imgGenEnhanced(payload);
    } else {
      ctx.reply("Bot disabled");
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
        const filePath = `${config.openAi.imageGen.telegramFileUrl}${config.telegramBotAuthToken}/${file.file_path}`;
        const payload = {
          chatId: ctx.chat?.id!,
          prompt: prompt as string,
          numImages: await ctx.session.openAi.imageGen.numImages,
          imgSize: await ctx.session.openAi.imageGen.imgSize,
          filePath: filePath,
        };
        await alterImg(payload);
      }
    } catch (e: any) {
      this.logger.error(e);
      ctx.reply("An error occurred while generating the AI edit");
    }
  };
}
