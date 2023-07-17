import { Composer, Context } from "grammy";
import config from "../../config";
import { imgGen, imgGenEnhanced, alterImg, promptGen } from "./controller";
import { BotContext, ChatConversation } from "../types";
import { isAdmin } from "./utils/context";

export const chatGpt = new Composer<BotContext>();

chatGpt.command("prompt", async (ctx) => {
  const prompt = ctx.match;
  if (!prompt) {
    ctx.reply("Error: Missing prompt");
    return;
  }
  const payload = {
    chatId: ctx.chat.id,
    prompt: prompt,
    conversation:
      ctx.chat.type !== "private" ? [] : [{ role: "user", content: "test" }],
  };
  console.log("PAYLOAD", payload);
  await promptGen(payload);
  // if (ctx.session.openAi.chatGpt.isEnabled) {
  //   console.log("gen command");
  //   const prompt = ctx.match;
  //   if (!prompt) {
  //     ctx.reply("Error: Missing prompt");
  //     return;
  //   }
  //   const payload = {
  //     chatId: ctx.chat.id,
  //     prompt: ctx.match,
  //     numImages: await ctx.session.openAi.imageGen.numImages, // lazy load
  //     imgSize: await ctx.session.openAi.imageGen.imgSize, // lazy load
  //   };
  //   await imgGen(payload);
  // } else {
  //   ctx.reply("Bot disabled");
  // }
});
