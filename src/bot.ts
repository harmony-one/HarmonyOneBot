import express from "express";
import {
  Bot,
  session,
  Context,
  SessionFlavor,
  MemorySessionStorage,
} from "grammy";
import config from "./config";
import { VoiceMemo } from "./modules/voice-memo";
import { ImageGenSessionData, imageGen } from "./modules/image-gen/ImageGenBot";
import { mainMenu } from './pages'

export interface SessionData {
  imageGen: ImageGenSessionData;
}
export type BotContext = Context & SessionFlavor<SessionData>;

export const bot = new Bot<BotContext>(config.telegramBotAuthToken);

function initial(): SessionData {
  return {
    imageGen: {
      numImages: config.imageGen.sessionDefault.numImages,
      imgSize: config.imageGen.sessionDefault.imgSize,
    },
  };
}

bot.use(session({ initial, storage: new MemorySessionStorage() }));

bot.use(mainMenu);

const voiceMemo = new VoiceMemo();

const onMessage = async (ctx: any) => {
  if(voiceMemo.isSupportedEvent(ctx)) {
    voiceMemo.onEvent(ctx)
  }
}

bot.command("start", (ctx) => ctx.reply("Welcome! Up and running."));

bot.command("help", async (ctx) => {
  console.log("help command", ctx.session);
  await ctx.reply('Help text...', {
    parse_mode: "HTML",
    reply_markup: mainMenu,
  });
});

bot.use(imageGen)

bot.on("message", onMessage);

const app = express();

app.use(express.json());

app.listen(config.port, () => {
  console.log(`Bot listening on port ${config.port}`);
  bot.start()
  // bot.start({
  //   allowed_updates: ["callback_query"], // Needs to be set for menu middleware, but bot doesn't work with current configuration.   
  // });
});
