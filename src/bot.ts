import express from "express";
import {
  Bot,
  session,
  MemorySessionStorage,
} from "grammy";
import config from "./config";
import {BotContext, BotSessionData, OnMessageContext} from "./modules/types";
import { mainMenu } from './pages'

import { VoiceMemo } from "./modules/voice-memo";
import { QRCodeBot } from "./modules/qrcode/QRCodeBot";
import { imageGen } from "./modules/image-gen/ImageGenBot";

export const bot = new Bot<BotContext>(config.telegramBotAuthToken);

function createInitialSessionData(): BotSessionData {
  return {
    imageGen: {
      numImages: config.imageGen.sessionDefault.numImages,
      imgSize: config.imageGen.sessionDefault.imgSize,
    },
    qrMargin: 1
  };
}

bot.use(session({ initial: createInitialSessionData, storage: new MemorySessionStorage() }));

bot.use(mainMenu);

const voiceMemo = new VoiceMemo();
const qrCodeBot = new QRCodeBot();

const onMessage = async (ctx: OnMessageContext) => {
  if (qrCodeBot.isSupportedEvent(ctx)) {
    qrCodeBot.onEvent(ctx);
  }
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
