import express from "express";
import {Bot, CommandContext, Context} from "grammy";
import config from './config'
import {VoiceMemo} from "./modules/voice-memo";

const bot = new Bot(config.telegramBotAuthToken);

const voiceMemo = new VoiceMemo()

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
