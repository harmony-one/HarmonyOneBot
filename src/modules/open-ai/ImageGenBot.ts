import { Composer, Context } from "grammy";
import { pino } from "pino";

import config from "../../config";
import { imgGen, imgGenEnhanced, alterImg } from "./controller";
import { BotContext } from "../types";
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

export const imageGen = new Composer<BotContext>();
!config.openAi.imageGen.isEnabled && logger.warn(`Dall-e2 Bot disabled in config`)

imageGen.command("genImg", async (ctx) => {
  if (ctx.session.openAi.imageGen.isEnabled) {
    console.log("gen command");
    const prompt = ctx.match;
    if (!prompt) {
      ctx.reply("Error: Missing prompt");
      return;
    }
    const payload = {
      chatId: ctx.chat.id,
      prompt: ctx.match,
      numImages: await ctx.session.openAi.imageGen.numImages, // lazy load
      imgSize: await ctx.session.openAi.imageGen.imgSize, // lazy load
    };
    await imgGen(payload);
  } else {
    ctx.reply("Bot disabled");
  }
});

imageGen.command("genImgEn", async (ctx) => {
  if (ctx.session.openAi.imageGen.isEnabled) {
    console.log("genEn command");
    const prompt = ctx.match;
    if (!prompt) {
      ctx.reply("Error: Missing prompt");
      return;
    }
    const payload = {
      chatId: ctx.chat.id,
      prompt: ctx.match,
      numImages: await ctx.session.openAi.imageGen.numImages,
      imgSize: await ctx.session.openAi.imageGen.imgSize,
    };
    ctx.reply("generating improved prompt...");
    await imgGenEnhanced(payload);
  } else {
    ctx.reply("Bot disabled");
  }
});

imageGen.on("message", async (ctx, next) => {
  try {
    const photo = ctx.message.photo || ctx.message.reply_to_message?.photo;
    if (photo && ctx.session.openAi.imageGen.isEnabled) {
      console.log("Alter img command");
      const prompt = ctx.message.caption || ctx.message.text;
      if (prompt && !isNaN(+prompt)) {
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
    next();
  } catch (e: any) {
    logger.error(e);
    ctx.reply("An error occurred while generating the AI edit");
  }
});
