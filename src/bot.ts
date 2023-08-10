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
import { OpenAIBot } from "./modules/open-ai";
import { OneCountryBot } from "./modules/1country";
import { Wallet } from "./modules/wallet";
import { WalletConnect } from "./modules/walletconnect";
import { BotPayments } from "./modules/payment";
import { BotSchedule } from "./modules/schedule";
import { ConversationHandler } from "./modules/conversation-handler/";
import config from "./config";
import { commandHelpText } from "./constants";
import { limit } from "@grammyjs/ratelimiter";

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

bot.use(
  limit({
    // Allow only 1 message to be handled every 2 seconds.
    timeFrame: 2000,
    limit: 1,

    // This is called when the limit is exceeded.
    onLimitExceeded: async (ctx) => {
      await ctx.reply("Please refrain from sending too many requests!");
    },

    // Note that the key should be a number in string format such as "123456789".
    keyGenerator: (ctx) => {
      return ctx.from?.id.toString();
    },
  })
);

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
const payments = new BotPayments();
const schedule = new BotSchedule(bot);
const openAiBot = new OpenAIBot();
const oneCountryBot = new OneCountryBot();
const conversationHandler = new ConversationHandler(bot);

const onMessage = async (ctx: OnMessageContext) => {
  if (qrCodeBot.isSupportedEvent(ctx)) {
    const price = qrCodeBot.getEstimatedPrice(ctx);
    const isPaid = await payments.pay(ctx, price);
    if (isPaid) {
      return qrCodeBot
        .onEvent(ctx, (reason?: string) => {
          payments.refundPayment(reason, ctx, price);
        })
    }
  }
  if (sdImagesBot.isSupportedEvent(ctx)) {
    const price = sdImagesBot.getEstimatedPrice(ctx);
    const isPaid = await payments.pay(ctx, price);
    if (isPaid) {
      return sdImagesBot
        .onEvent(ctx, (reason?: string) => {
          payments.refundPayment(reason, ctx, price);
        })
    }
  }
  if (voiceMemo.isSupportedEvent(ctx)) {
    const price = voiceMemo.getEstimatedPrice(ctx);
    const isPaid = await payments.pay(ctx, price);
    if (isPaid) {
      return voiceMemo
        .onEvent(ctx)
    }
  }
  if (openAiBot.isSupportedEvent(ctx)) {
    if (ctx.session.openAi.imageGen.isEnabled) {
      const price = openAiBot.getEstimatedPrice(ctx);
      if (price > 0) {
        //await ctx.reply(`Processing withdraw for ${price.toFixed(2)}¢...`);
      }
      const isPaid = await payments.pay(ctx, price);
      if (isPaid) {
        return openAiBot.onEvent(ctx)
      }
    } else {
      ctx.reply("Bot disabled");
      return;
    }
  }
  if (conversationHandler.isSupportedEvent(ctx)) {
    if (ctx.session.openAi.chatGpt.isEnabled) {
      if (conversationHandler.isValidCommand(ctx)) {
        const price = conversationHandler.getEstimatedPrice(ctx);
        if (price > 0) {
          //await ctx.reply(`Processing withdraw for ${price.toFixed(2)}¢...`);
        }
        const isPaid = await payments.pay(ctx, price);
        if (isPaid) {
          return conversationHandler
            .onEvent(ctx)
            .catch((e) => payments.refundPayment(e, ctx, price));
        }
        return;
      } else {
        ctx.reply("Error: Missing prompt");
        return
      }
    } else {
      ctx.reply("Bot disabled");
      return;
    }
  }
  // if (oneCountryBot.isSupportedEvent(ctx)) {
  //   const price = oneCountryBot.getEstimatedPrice(ctx);
  //   if (price > 0) {
  //     await ctx.reply(`Processing withdraw for ${price.toFixed(2)}¢...`);
  //   }
  //   const isPaid = await payments.pay(ctx, price);
  //   if (isPaid) {
  //     return oneCountryBot
  //       .onEvent(ctx)
  //       .catch((e) => payments.refundPayment(e, ctx, price));
  //   }
  // }
  if (wallet.isSupportedEvent(ctx)) {
    return wallet.onEvent(ctx);
  }
  if (walletConnect.isSupportedEvent(ctx)) {
    return walletConnect.onEvent(ctx);
  }
  if (payments.isSupportedEvent(ctx)) {
    return payments.onEvent(ctx);
  }
  if (schedule.isSupportedEvent(ctx)) {
    return schedule.onEvent(ctx);
  }
  // if (ctx.update.message.text && ctx.update.message.text.startsWith("/", 0)) {
  //  const command = ctx.update.message.text.split(' ')[0].slice(1)
  // onlfy for private chats
  if (ctx.update.message.chat && ctx.chat.type === 'private') {
    ctx.reply(
      `Command not supported.\nWrite */menu* to learn available commands`,
      {
        parse_mode: "Markdown",
      }
    );
    return;
  }
  if (ctx.update.message.chat) {
    logger.info(`Received message in chat id: ${ctx.update.message.chat.id}`);
  }
};

const onCallback = async (ctx: OnCallBackQueryData) => {
  if (qrCodeBot.isSupportedEvent(ctx)) {
    qrCodeBot.onEvent(ctx, (reason) => {
      logger.error(`qr generate error: ${reason}`)
    });
    return;
  }

  if (sdImagesBot.isSupportedEvent(ctx)) {
    sdImagesBot.onEvent(ctx, (e) => { console.log(e, '// TODO refund payment'); });
    return;
  }
};

bot.command("start", (ctx) =>
  ctx.reply(commandHelpText,{
    parse_mode: "Markdown",
  })
);

bot.command("help", (ctx) =>
  ctx.reply(commandHelpText,{
    parse_mode: "Markdown",
  })
);

bot.command("menu", async (ctx) => {
  await ctx.reply(
    `
  
*Main Menu*
  
🌟 Welcome to the Harmony One Bot! 🤖
  
💲 Send money to your /balance to start! 🚀
  `,
    {
      parse_mode: "Markdown",
      reply_markup: mainMenu,
    }
  );
});

bot.on("message", onMessage);
bot.on("callback_query:data", onCallback);

bot.catch((err) => {
  const ctx = err.ctx;
  logger.error(`Error while handling update ${ctx.update.update_id}:`);
  const e = err.error;
  if (e instanceof GrammyError) {
    logger.error("Error in request:", e.description);
  } else if (e instanceof HttpError) {
    logger.error("Could not contact Telegram:", e);
  } else {
    logger.error("Unknown error:", e);
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
