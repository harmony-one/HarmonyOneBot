import express from "express";
import {
  Bot,
  BotError,
  GrammyError,
  HttpError,
  MemorySessionStorage,
  session,
} from "grammy";
import config from "./config";
import {
  BotContext,
  BotSessionData,
  OnCallBackQueryData,
  OnMessageContext,
} from "./modules/types";
import { mainMenu } from "./pages";
import { VoiceMemo } from "./modules/voice-memo";
import { QRCodeBot } from "./modules/qrcode/QRCodeBot";
import { SDImagesBot } from "./modules/sd-images";
import { imageGen } from "./modules/open-ai/ImageGenBot";
import { chatGpt } from "./modules/open-ai/chatGptBot";
import { oneCountry } from "./modules/1country/oneCountryBot";
import { Wallet } from "./modules/wallet";
import { WalletConnect } from "./modules/walletconnect";
import {BotPayments} from "./modules/payment";

export const bot = new Bot<BotContext>(config.telegramBotAuthToken);

function createInitialSessionData(): BotSessionData {
  return {
    openAi: {
      imageGen: {
        numImages: config.openAi.imageGen.sessionDefault.numImages,
        imgSize: config.openAi.imageGen.sessionDefault.imgSize,
        isEnabled: config.openAi.imageGen.isEnabled,
      },
      chatGpt: {
        model: config.openAi.chatGpt.model,
        isEnabled: config.openAi.chatGpt.isEnabled,
        chatConversation: [],
      },
    },
    qrMargin: 1,
  };
}

bot.use(
  session({
    initial: createInitialSessionData,
    storage: new MemorySessionStorage<BotSessionData>(),
  })
);

bot.use(mainMenu);

const voiceMemo = new VoiceMemo();
const qrCodeBot = new QRCodeBot();
const sdImagesBot = new SDImagesBot();
const wallet = new Wallet();
const walletConnect = new WalletConnect();
const payments = new BotPayments()

const onMessage = async (ctx: OnMessageContext) => {
  if (qrCodeBot.isSupportedEvent(ctx)) {
    const price = qrCodeBot.getEstimatedPrice(ctx)
    const isSuccessfulPayment = await payments.pay(ctx, price)
    if(isSuccessfulPayment) {
      return qrCodeBot.onEvent(ctx);
    }
  }
  if (sdImagesBot.isSupportedEvent(ctx)) {
    return sdImagesBot.onEvent(ctx);
  }
  if (voiceMemo.isSupportedEvent(ctx)) {
    const price = voiceMemo.getEstimatedPrice(ctx)
    const isSuccessfulPayment = await payments.pay(ctx, price)
    if(isSuccessfulPayment) {
      return voiceMemo.onEvent(ctx);
    }
  }
  if (wallet.isSupportedEvent(ctx)) {
    return wallet.onEvent(ctx);
  }
  if(walletConnect.isSupportedEvent(ctx)) {
    return walletConnect.onEvent(ctx)
  }
}

const onCallback = async (ctx: OnCallBackQueryData) => {
  if (qrCodeBot.isSupportedEvent(ctx)) {
    qrCodeBot.onEvent(ctx);
    return;
  }

  if (sdImagesBot.isSupportedEvent(ctx)) {
    sdImagesBot.onEvent(ctx);
    return;
  }
};

bot.command("start", (ctx) => ctx.reply("Welcome! Up and running."));

bot.command("help", async (ctx) => {
  console.log("help command", ctx.session);
  await ctx.reply("Menu", {
    parse_mode: "HTML",
    reply_markup: mainMenu,
  });
});

bot.use(oneCountry);
bot.use(imageGen);
bot.use(chatGpt);

bot.on("message", onMessage);
bot.on("callback_query:data", onCallback);

bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  const e = err.error;
  if (e instanceof GrammyError) {
    console.error("Error in request:", e.description);
  } else if (e instanceof HttpError) {
    console.error("Could not contact Telegram:", e);
  } else {
    console.error("Unknown error:", e);
  }
});

bot.errorBoundary((error) => {
  console.log("### error", error);
});

const app = express();

app.use(express.json());
app.use(express.static("./public")); // Public directory, used in voice-memo bot

app.listen(config.port, () => {
  console.log(`Bot listening on port ${config.port}`);
  bot.start();
  // bot.start({
  //   allowed_updates: ["callback_query"], // Needs to be set for menu middleware, but bot doesn't work with current configuration.
  // });
});
