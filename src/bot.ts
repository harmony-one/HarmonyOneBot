import express from "express";
import {
  Bot,
  GrammyError,
  HttpError,
  MemorySessionStorage,
  session,
} from "grammy";
import { pino } from "pino";

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
import { openAi } from "./modules/open-ai/openAiBot";
import { OpenAIBot } from './modules/open-ai'
import { oneCountry } from "./modules/1country/oneCountryBot";
import { Wallet } from "./modules/wallet";
import { WalletConnect } from "./modules/walletconnect";
import {BotPayments} from "./modules/payment";
import {BotSchedule} from "./modules/schedule";
import {Api} from "telegram";
import { conversationHandler } from './modules/conversation-handler/conversationHandler'

import config from "./config";


const logger = pino({
  name: "bot",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
  },
});

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
const schedule = new BotSchedule(bot)
const openAiBot = new OpenAIBot()

const onMessage = async (ctx: OnMessageContext) => {
  if (qrCodeBot.isSupportedEvent(ctx)) {
    const price = qrCodeBot.getEstimatedPrice(ctx)
    const isPaid = await payments.pay(ctx, price)
    if(isPaid) {
      return qrCodeBot.onEvent(ctx).catch((e) => payments.refundPayment(e, ctx, price));
    }
  }
  if (sdImagesBot.isSupportedEvent(ctx)) {
    const price = sdImagesBot.getEstimatedPrice(ctx)
    const isPaid = await payments.pay(ctx, price)
    if(isPaid) {
      return sdImagesBot.onEvent(ctx).catch((e) => payments.refundPayment(e, ctx, price));
    }
  }
  if (voiceMemo.isSupportedEvent(ctx)) {
    const price = voiceMemo.getEstimatedPrice(ctx)
    const isPaid = await payments.pay(ctx, price)
    if(isPaid) {
      return voiceMemo.onEvent(ctx).catch((e) => payments.refundPayment(e, ctx, price));
    }
  }
  if (openAiBot.isSupportedEvent(ctx)) {
    const price = openAiBot.getEstimatedPrice(ctx)
    await ctx.reply(`Processing withdraw for ${price}¢...`)
    const isPaid = await payments.pay(ctx, price)
    if(isPaid) {
      return openAiBot.onEvent(ctx);
    }
  }
  if (wallet.isSupportedEvent(ctx)) {
    return wallet.onEvent(ctx);
  }
  if(walletConnect.isSupportedEvent(ctx)) {
    return walletConnect.onEvent(ctx)
  }
  if(payments.isSupportedEvent(ctx)) {
    return payments.onEvent(ctx)
  }
  if(schedule.isSupportedEvent(ctx)) {
    return schedule.onEvent(ctx)
  }
  if(ctx.update.message.chat) {
    console.log(`Received message in chat id: ${ctx.update.message.chat.id}`)
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

bot.command("start", (ctx) => ctx.reply(`Welcome! Up and running. Use /menu for options.`));

bot.command("menu", async (ctx) => {
  await ctx.reply("Main Menu", {
    parse_mode: "HTML",
    reply_markup: mainMenu,
  });
});

bot.use(conversationHandler)
bot.use(oneCountry);
// bot.use(openAi);

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
  logger.error("### error", error);
});

const app = express();

app.use(express.json());
app.use(express.static("./public")); // Public directory, used in voice-memo bot

app.listen(config.port, () => {
  logger.info(`Bot listening on port ${config.port}`);
  bot.start();
  // bot.start({
  //   allowed_updates: ["callback_query"], // Needs to be set for menu middleware, but bot doesn't work with current configuration.
  // });
});
