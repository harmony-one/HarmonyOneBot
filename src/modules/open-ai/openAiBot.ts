import { Composer, Context } from "grammy";
import { pino } from "pino";

import config from "../../config";
import { imgGen, imgGenEnhanced, alterImg } from "./controller";
import { BotContext, OnMessageContext } from "../types";
import {
  getChatModel,
  getChatModelPrice,
  getDalleModel,
  getDalleModelPrice,
  getTokenNumber,
} from "./api/openAi";
import { BotPayments } from "../payment";
interface Image {
  url: string;
}

const logger = pino({
  name: "ImagenGenBot",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
  },
});

const payments = new BotPayments()

// amount returned in cents
export const getEstimatedPrice = (ctx: BotContext) => {
  const prompts = ctx.match
  if (!prompts) {
    return 0;
  }
  if (ctx.hasCommand("chat")) {
    const baseTokens = getTokenNumber(prompts as string);
    const modelName = ctx.session.openAi.chatGpt.model;
    const model = getChatModel(modelName);
    const price = getChatModelPrice(model,true, baseTokens); //cents
    return ctx.chat.type !== "private" ? price * 4 : price;
  }
  if (ctx.hasCommand("genImg")) {
    const imageNumber = ctx.session.openAi.imageGen.numImages;
    const imageSize = ctx.session.openAi.imageGen.imgSize;
    const model = getDalleModel(imageSize);
    const price = getDalleModelPrice(model,true,imageNumber); //cents
    return price; 
  }
  if (ctx.hasCommand("genImgEn")) {
    const imageNumber = ctx.session.openAi.imageGen.numImages;
    const imageSize = ctx.session.openAi.imageGen.imgSize;
    const chatModelName = ctx.session.openAi.chatGpt.model;
    const chatModel = getChatModel(chatModelName);
    const model = getDalleModel(imageSize);
    const price = getDalleModelPrice(model, true, imageNumber, true, chatModel);  //cents
    return price;
  }
  return 0
};

export const openAi = new Composer<BotContext>();
!config.openAi.imageGen.isEnabled &&
  logger.warn(`Dall-e2 Bot disabled in config`);

openAi.command("genImg", async (ctx) => {
  if (ctx.session.openAi.imageGen.isEnabled) {
    const prompt = ctx.match;
    if (!prompt) {
      ctx.reply("Error: Missing prompt");
      return;
    }
    const price = getEstimatedPrice(ctx);
    // ctx.reply(`Here is the price ${price!.toFixed(2)}¢`)
    const isPaid = await payments.pay(ctx as OnMessageContext, price)
    if (isPaid) {
      const payload = {
        chatId: ctx.chat.id,
        prompt: ctx.match,
        numImages: await ctx.session.openAi.imageGen.numImages, // lazy load
        imgSize: await ctx.session.openAi.imageGen.imgSize, // lazy load
      };
      await imgGen(payload);
    }
  } else {
    ctx.reply("Bot disabled");
  }
});

openAi.command("genImgEn", async (ctx) => {
  if (ctx.session.openAi.imageGen.isEnabled) {
    const prompt = ctx.match;
    if (!prompt) {
      ctx.reply("Error: Missing prompt");
      return;
    }
    const price = getEstimatedPrice(ctx);
    ctx.reply(`Here is the price ${price!.toFixed(2)}¢`)
    const isPaid = await payments.pay(ctx as OnMessageContext, price)
    if (isPaid) {
      const payload = {
        chatId: ctx.chat.id,
        prompt: ctx.match,
        numImages: await ctx.session.openAi.imageGen.numImages,
        imgSize: await ctx.session.openAi.imageGen.imgSize,
      };
      ctx.reply("generating improved prompt...");
      await imgGenEnhanced(payload);
    }
  } else {
    ctx.reply("Bot disabled");
  }
});

openAi.on("message", async (ctx, next) => {
  try {
    const photo = ctx.message.photo || ctx.message.reply_to_message?.photo;
    if (photo && ctx.session.openAi.imageGen.isEnabled) {
      const prompt = ctx.message.caption || ctx.message.text;
      if (prompt && !isNaN(+prompt)) {
        const price = getEstimatedPrice(ctx);
        const isPaid = true; // await payments.pay(ctx, price)
        if (isPaid) {
          const file_id = photo.pop()?.file_id; // with pop() get full image quality
          const file = await ctx.api.getFile(file_id!);
          const filePath = `${config.openAi.imageGen.telegramFileUrl}${config.telegramBotAuthToken}/${file.file_path}`;
          const payload = {
            chatId: ctx.chat.id,
            prompt: prompt,
            numImages: await ctx.session.openAi.imageGen.numImages,
            imgSize: await ctx.session.openAi.imageGen.imgSize,
            filePath: filePath,
          };
          await alterImg(payload);
        }
      }
    }
    next();
  } catch (e: any) {
    logger.error(e);
    ctx.reply("An error occurred while generating the AI edit");
  }
});
