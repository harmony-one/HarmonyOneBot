import express from "express";
import {Bot, MemorySessionStorage, session} from "grammy";
import config from './config'
import {VoiceMemo} from "./modules/voice-memo";
import {BotContext, BotSessionData, OnMessageContext} from "./modules/types";
import {QRCodeBot} from "./modules/qrcode/QRCodeBot";

const bot = new Bot<BotContext>(config.telegramBotAuthToken);

function createInitialSessionData(): BotSessionData {
  return { qrMargin: 1 };
}

bot.use(session({
  initial: createInitialSessionData,
  storage: new MemorySessionStorage()
}));

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
bot.on("message", onMessage);

const app = express();
app.use(express.json());

app.listen(config.port, () => {
  console.log(`Bot listening on port ${config.port}`);
  bot.start();
});
