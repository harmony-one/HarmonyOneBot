import express from "express";
import {Bot, MemorySessionStorage, session} from "grammy";
import config from './config'
import { BotContext, BotSessionData, OnCallBackQueryData, OnMessageContext } from "./modules/types";
import { mainMenu } from './pages'
import { VoiceMemo } from "./modules/voice-memo";
import { QRCodeBot } from "./modules/qrcode/QRCodeBot";
import {SDImagesBot} from "./modules/sd-images";
import { imageGen } from "./modules/image-gen/ImageGenBot";
import { oneCountry } from "./modules/1country/oneCountryBot";
import { Wallet } from "./modules/wallet";

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

// bot.use(mainMenu);

const voiceMemo = new VoiceMemo();
const qrCodeBot = new QRCodeBot();
const sdImagesBot = new SDImagesBot();
const wallet = new Wallet()

const onMessage = async (ctx: OnMessageContext) => {
  if (wallet.isSupportedEvent(ctx)) {
    return wallet.onEvent(ctx);
  } else if (qrCodeBot.isSupportedEvent(ctx)) {
    return qrCodeBot.onEvent(ctx);
  } else if (sdImagesBot.isSupportedEvent(ctx)) {
    return sdImagesBot.onEvent(ctx);
  } else if(voiceMemo.isSupportedEvent(ctx)) {
    return voiceMemo.onEvent(ctx)
  }
}

const onCallback = async (ctx: OnCallBackQueryData) => {
  if (qrCodeBot.isSupportedEvent(ctx)) {
    qrCodeBot.onEvent(ctx);
    return;
  }
}

bot.command("start", (ctx) => ctx.reply("Welcome! Use /test command to check the wallet."));

bot.command("help", async (ctx) => {
  console.log("help command", ctx.session);
  await ctx.reply('Use /test command to check the wallet.');
});

// bot.use(oneCountry)
// bot.use(imageGen)

bot.on("message", onMessage);
bot.on("callback_query:data", onCallback);

const app = express();

app.use(express.json());

app.listen(config.port, () => {
  console.log(`Bot listening on port ${config.port}`);
  bot.start()
  // bot.start({
  //   allowed_updates: ["callback_query"], // Needs to be set for menu middleware, but bot doesn't work with current configuration.
  // });
});
