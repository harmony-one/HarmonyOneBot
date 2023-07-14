import { Composer } from "grammy";
import config from "../../config";
import { imgGen, imgGenEnhanced, alterImg } from "./controller";
import { BotContext } from "../types";

interface Image {
  url: string;
}

export const imageGen = new Composer<BotContext>();

imageGen.command("genImg", async (ctx) => {
  if (ctx.session.imageGen.isEnabled) {
    console.log("gen command");
    const prompt = ctx.match;
    if (!prompt) {
      ctx.reply("Error: Missing prompt");
      return;
    }
    const payload = {
      chatId: ctx.chat.id,
      prompt: ctx.match,
      numImages: await ctx.session.imageGen.numImages, // lazy load
      imgSize: await ctx.session.imageGen.imgSize, // lazy load
    };
    await imgGen(payload);
  } else {
    ctx.reply("Bot disabled");
  }
});

imageGen.command("genImgEn", async (ctx) => {
  if (ctx.session.imageGen.isEnabled) {
    console.log("genEn command");
    const prompt = ctx.match;
    if (!prompt) {
      ctx.reply("Error: Missing prompt");
      return;
    }
    const payload = {
      chatId: ctx.chat.id,
      prompt: ctx.match,
      numImages: await ctx.session.imageGen.numImages,
      imgSize: await ctx.session.imageGen.imgSize,
    };
    ctx.reply("generating improved prompt...");
    await imgGenEnhanced(payload);
  } else {
    ctx.reply("Bot disabled");
  }
});

// imageGen.command("admin", async (ctx) => {
//   const admins = await ctx.getChatAdministrators()
//   const adminsIds = admins.reduce<number[]>((result, item) => {
//     result.push(item.user.id);
//     return result;
//   }, []);
//   console.log(adminsIds, ctx.from?.id, ctx.from?.first_name, ctx.from)
// });

imageGen.on("message", async (ctx, next) => {
  try {
    const photo = ctx.message.photo || ctx.message.reply_to_message?.photo;
    if (photo && ctx.session.imageGen.isEnabled) {
      console.log("Alter img command");
      const prompt = ctx.message.caption || ctx.message.text;
      if (prompt && !isNaN(+prompt)) {
        const file_id = photo.pop()?.file_id; // with pop() get full image quality
        const file = await ctx.api.getFile(file_id!);
        const filePath = `${config.imageGen.telegramFileUrl}${config.telegramBotAuthToken}/${file.file_path}`;
        const payload = {
          chatId: ctx.chat.id,
          prompt: prompt,
          numImages: await ctx.session.imageGen.numImages,
          imgSize: await ctx.session.imageGen.imgSize,
          filePath: filePath,
        };
        await alterImg(payload);
      }
    }
    next();
  } catch (e: any) {
    console.log(e);
    ctx.reply("An error occurred while generating the AI edit");
  }
});
