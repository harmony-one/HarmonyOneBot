import express from "express";
import {Bot, CommandContext, Context, MemorySessionStorage, session} from "grammy";
import config from './config'
import {VoiceMemo} from "./modules/voice-memo";
import {BotContext, BotSessionData} from "./modules/types";
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
const qrCodeBot = new QRCodeBot(bot);
qrCodeBot.init();

const onMessage = async (ctx: any) => {
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
