import express from "express";
import {Bot, BotError, GrammyError, HttpError, MemorySessionStorage, session} from "grammy";
import config from './config'
import { BotContext, BotSessionData, OnCallBackQueryData, OnMessageContext } from "./modules/types";
import { mainMenu } from './pages'
import { VoiceMemo } from "./modules/voice-memo";
import { QRCodeBot } from "./modules/qrcode/QRCodeBot";
import { SDImagesBot } from "./modules/sd-images";
import { imageGen } from "./modules/image-gen/ImageGenBot";
import { oneCountry } from "./modules/1country/oneCountryBot";
import { Wallet } from "./modules/wallet";
import {BotPayments} from "./modules/payment";
import pino from "pino";

export const bot = new Bot<BotContext>(config.telegramBotAuthToken);

const logger = pino({
  name: 'Bot',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
})

function createInitialSessionData(): BotSessionData {
  return {
    imageGen: {
      numImages: config.imageGen.sessionDefault.numImages,
      imgSize: config.imageGen.sessionDefault.imgSize,
      isEnabled: config.imageGen.isEnabled
    },
    qrMargin: 1
  };
}

bot.use(session({ initial: createInitialSessionData, storage: new MemorySessionStorage() }));

bot.use(mainMenu);

const voiceMemo = new VoiceMemo();
const qrCodeBot = new QRCodeBot();
const sdImagesBot = new SDImagesBot();
const wallet = new Wallet()
const payments = new BotPayments()

const onMessage = async (ctx: OnMessageContext) => {
  if (qrCodeBot.isSupportedEvent(ctx)) {
    return qrCodeBot.onEvent(ctx);
  }
  if (sdImagesBot.isSupportedEvent(ctx)) {
    return sdImagesBot.onEvent(ctx);
  }
  if(voiceMemo.isSupportedEvent(ctx)) {
    const userId = ctx.update.message.from.id
    const userName = ctx.update.message.from.username
    const amountUSD = voiceMemo.estimatePrice(ctx)
    const amountONE = payments.convertUSDCentsToOne(amountUSD)
    const isSufficientBalance = await payments.isEnoughBalance(userId, amountUSD)

    logger.info(`[${userId}(@${userName})] request price: ${amountUSD} $c (${amountONE.toString()} ONE), isSufficientBalance: ${isSufficientBalance}`)

    if(isSufficientBalance) {
      try {
        const tx = await payments.withdraw(userId, amountUSD)
        logger.info(`[${userId}(@${userName})] withdraw successful, txHash: ${tx.transactionHash}, from: ${tx.from}, to: ${tx.to}`)
        return voiceMemo.onEvent(ctx)
      } catch (e) {
        logger.error(`[${userId}(@${userName})] error on withdraw: "${JSON.stringify((e as Error).message)}"`)
        ctx.reply(`Error on transferring ONE ${JSON.stringify((e as Error).message)}`)
      }
    } else {
      ctx.reply(`Insufficient balance, send ${payments.convertONE(amountONE)}`)
    }
  }
  if(wallet.isSupportedEvent(ctx)) {
    return wallet.onEvent(ctx)
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
}

bot.command("start", (ctx) => ctx.reply("Welcome! Up and running."));

bot.command("help", async (ctx) => {
  console.log("help command", ctx.session);
  await ctx.reply('Menu', {
    parse_mode: "HTML",
    reply_markup: mainMenu,
  });
});

bot.use(oneCountry)
bot.use(imageGen)

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
})

bot.errorBoundary((error) => {
  console.log('### error', error);
})

const app = express();

app.use(express.json());
app.use(express.static('./public')) // Public directory, used in voice-memo bot

app.listen(config.port, () => {
  console.log(`Bot listening on port ${config.port}`);
  bot.start()
  // bot.start({
  //   allowed_updates: ["callback_query"], // Needs to be set for menu middleware, but bot doesn't work with current configuration.
  // });
});
