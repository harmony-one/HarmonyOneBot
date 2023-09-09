require("events").EventEmitter.defaultMaxListeners = 30;
import express from "express";
import {
  Bot,
  Enhance,
  GrammyError,
  HttpError,
  MemorySessionStorage,
  enhanceStorage,
  session,
} from "grammy";
import { autoChatAction } from "@grammyjs/auto-chat-action";
import { limit } from "@grammyjs/ratelimiter";
import { pino } from "pino";

import {
  BotContext,
  BotSessionData,
  OnCallBackQueryData,
  OnMessageContext,
} from "./modules/types";
import { mainMenu } from "./pages";
import { TranslateBot } from "./modules/translate/TranslateBot";
import { VoiceMemo } from "./modules/voice-memo";
import { QRCodeBot } from "./modules/qrcode/QRCodeBot";
import { SDImagesBot } from "./modules/sd-images";
import { OpenAIBot } from "./modules/open-ai";
import { OneCountryBot } from "./modules/1country";
import { WalletConnect } from "./modules/walletconnect";
import { BotPayments } from "./modules/payment";
import { BotSchedule } from "./modules/schedule";
import { DocumentHandler } from "./modules/document-handler";
import config from "./config";
import { commandsHelpText, TERMS, SUPPORT, FEEDBACK, LOVE, MODELS } from "./constants";
import prometheusRegister, { PrometheusMetrics } from "./metrics/prometheus";

import { chatService, statsService } from "./database/services";
import { AppDataSource } from "./database/datasource";
import { autoRetry } from "@grammyjs/auto-retry";
import { run } from "@grammyjs/runner";
import { runBotHeartBit } from "./monitoring/monitoring";
import { BotPaymentLog } from "./database/stats.service";
import { getChatMemberInfo } from "./modules/open-ai/utils/web-crawler";

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
bot.api.config.use(autoRetry());

bot.use(
  limit({
    // Allow only 3 message to be handled every 3 seconds.
    timeFrame: 3000,
    limit: 3,

    // This is called when the limit is exceeded.
    onLimitExceeded: async (ctx) => {
      // await ctx.reply("Please refrain from sending too many requests")
      logger.error(`@${ctx.from?.username} has exceeded the message limit`);
      // await ctx.reply("");
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
        numImages: config.openAi.dalle.sessionDefault.numImages,
        imgSize: config.openAi.dalle.sessionDefault.imgSize,
        isEnabled: config.openAi.dalle.isEnabled,
      },
      chatGpt: {
        model: config.openAi.chatGpt.model,
        isEnabled: config.openAi.chatGpt.isEnabled,
        chatConversation: [],
        price: 0,
        usage: 0,
        isProcessingQueue: false,
        requestQueue: [],
      },
    },
    oneCountry: {
      lastDomain: "",
    },
    translate: {
      languages: [],
      enable: false,
    },
  };
}

bot.use(
  session({
    initial: createInitialSessionData,
    storage: enhanceStorage<BotSessionData>({
      storage: new MemorySessionStorage<Enhance<BotSessionData>>(),
      millisecondsToLive: config.sessionTimeout * 60 * 60 * 1000, //48 hours
    }),
  })
);
bot.use(autoChatAction());
bot.use(mainMenu);

const voiceMemo = new VoiceMemo();
const qrCodeBot = new QRCodeBot();
const sdImagesBot = new SDImagesBot();
const walletConnect = new WalletConnect();
const payments = new BotPayments();
const schedule = new BotSchedule(bot);
const openAiBot = new OpenAIBot(payments);
const oneCountryBot = new OneCountryBot();
const translateBot = new TranslateBot();
const documentBot = new DocumentHandler();

bot.on("message:new_chat_members:me", async (ctx) => {
  try {
    const accountId = payments.getAccountId(ctx as OnMessageContext);

    const chat = await chatService.getAccountById(accountId);

    if (chat) {
      return;
    }

    const tgUserId = ctx.message.from.id;
    const tgUsername = ctx.message.from.username || "";

    await chatService.initChat({ tgUserId, accountId, tgUsername });
  } catch (err) {
    logger.info(`Create chat error ${err}`);
  }
});

const assignFreeCredits = async (ctx: OnMessageContext) => {
  const { chat } = ctx.update.message;

  const accountId = payments.getAccountId(ctx as OnMessageContext);
  let tgUserId = accountId;
  let tgUsername = "";

  const isCreditsAssigned = await chatService.isCreditsAssigned(accountId);
  if (isCreditsAssigned) {
    return true;
  }

  try {
    if (chat.type === "group") {
      const members = await ctx.getChatAdministrators();
      const creator = members.find((member) => member.status === "creator");
      if (creator) {
        tgUserId = creator.user.id;
        tgUsername = creator.user.username || "";
      }
    }

    await chatService.initChat({ accountId, tgUserId, tgUsername });
    // logger.info(`credits transferred to accountId ${accountId} chat ${chat.type} ${chat.id}`)
  } catch (e) {
    logger.error(
      `Cannot check account ${accountId} credits: ${(e as Error).message}`
    );
  }
  return true;
};

bot.use((ctx, next) => {
  const entities = ctx.entities();

  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    if (entity.type === "bot_command" && ctx.message) {
      const tgUserId = ctx.message.from.id;
      statsService.addCommandStat({
        tgUserId,
        command: entity.text.replace("/", ""),
        rawMessage: "",
      });
    }
  }

  return next();
});

const writeCommandLog = async (
  ctx: OnMessageContext,
  isSupportedCommand = true
) => {
  const { from, text = "", chat } = ctx.update.message;

  try {
    const accountId = payments.getAccountId(ctx);
    const [command] = text?.split(" ");

    const log: BotPaymentLog = {
      tgUserId: from.id,
      accountId,
      command,
      groupId: chat.id,
      isPrivate: chat.type === "private",
      message: text,
      isSupportedCommand,
      amountCredits: 0,
      amountOne: 0,
    };
    await statsService.writeLog(log);
  } catch (e) {
    logger.error(
      `Cannot write unsupported command log: ${(e as Error).message}`
    );
  }
};

const onMessage = async (ctx: OnMessageContext) => {
  // console.log(ctx.update.message.document);
  try {
    await assignFreeCredits(ctx);
    if (qrCodeBot.isSupportedEvent(ctx)) {
      const price = qrCodeBot.getEstimatedPrice(ctx);
      const isPaid = await payments.pay(ctx, price);
      if (isPaid) {
        await qrCodeBot
          .onEvent(ctx, (reason?: string) => {
            payments.refundPayment(reason, ctx, price);
          })
          .catch((e) => {
            payments.refundPayment(e.message || "Unknown error", ctx, price);
          });
        return;
      }
    }
    if (sdImagesBot.isSupportedEvent(ctx)) {
      const price = sdImagesBot.getEstimatedPrice(ctx);
      const isPaid = await payments.pay(ctx, price);
      if (isPaid) {
        await sdImagesBot
          .onEvent(ctx, (reason?: string) => {
            payments.refundPayment(reason, ctx, price);
          })
          .catch((e) => {
            payments.refundPayment(e.message || "Unknown error", ctx, price);
          });
        return;
      }
      return;
    }
    if (voiceMemo.isSupportedEvent(ctx)) {
      const price = voiceMemo.getEstimatedPrice(ctx);
      const isPaid = await payments.pay(ctx, price);
      if (isPaid) {
        await voiceMemo.onEvent(ctx).catch((e) => {
          payments.refundPayment(e.message || "Unknown error", ctx, price);
        });
      }
      return;
    }

    if (documentBot.isSupportedEvent(ctx)) {
      const price = 1;
      const isPaid = await payments.pay(ctx, price);
      
      if (isPaid) {
        // const file = await bot.getFile();
        const response = await documentBot
          .onEvent(ctx, (reason?: string) => {
            payments.refundPayment(reason, ctx, price);
          })
          .catch((e) => {
            payments.refundPayment(e.message || "Unknown error", ctx, price);
            return { next: false };
          });

        if (!response) {
          return;
        }
      }
      
    }

    if (translateBot.isSupportedEvent(ctx)) {
      const price = translateBot.getEstimatedPrice(ctx);
      const isPaid = await payments.pay(ctx, price);

      if (isPaid) {
        const response = await translateBot
          .onEvent(ctx, (reason?: string) => {
            payments.refundPayment(reason, ctx, price);
          })
          .catch((e) => {
            payments.refundPayment(e.message || "Unknown error", ctx, price);
            return { next: false };
          });

        if (!response.next) {
          return;
        }
      }
    }

    if (await openAiBot.isSupportedEvent(ctx)) {
      if (ctx.session.openAi.imageGen.isEnabled) {
        const price = openAiBot.getEstimatedPrice(ctx);
        const isPaid = await payments.pay(ctx, price!);
        if (isPaid) {
          await openAiBot
            .onEvent(ctx)
            .catch((e) => payments.refundPayment(e, ctx, price!));
          return;
        }
        return;
      } else {
        await ctx.reply("Bot disabled", {
          message_thread_id: ctx.message?.message_thread_id,
        });
        return;
      }
    }
    if (oneCountryBot.isSupportedEvent(ctx)) {
      if (oneCountryBot.isValidCommand(ctx)) {
        const price = oneCountryBot.getEstimatedPrice(ctx);
        // if (price > 0) {
        //   await ctx.reply(`Processing withdraw for ${price.toFixed(2)}¢...`);
        // }
        const isPaid = await payments.pay(ctx, price);
        if (isPaid) {
          await oneCountryBot
            .onEvent(ctx)
            .catch((e) => payments.refundPayment(e, ctx, price));
          return;
        }
        return;
      } else {
        return;
      }
    }

    if (walletConnect.isSupportedEvent(ctx)) {
      await walletConnect.onEvent(ctx);
      return;
    }
    if (payments.isSupportedEvent(ctx)) {
      await payments.onEvent(ctx);
      return;
    }
    if (schedule.isSupportedEvent(ctx)) {
      await schedule.onEvent(ctx);
      return;
    }
    // if (ctx.update.message.text && ctx.update.message.text.startsWith("/", 0)) {
    //  const command = ctx.update.message.text.split(' ')[0].slice(1)
    // only for private chats
    if (ctx.update.message.chat && ctx.chat.type === "private") {
      await openAiBot.onEvent(ctx);
      // await ctx.reply(`Unsupported, type */help* for commands.`, {
      //   parse_mode: "Markdown",
      // });
      // await writeCommandLog(ctx, false);
      return;
    }
    if (ctx.update.message.chat) {
      logger.info(`Received message in chat id: ${ctx.update.message.chat.id}`);
    }
    await writeCommandLog(ctx, false);
  } catch (ex: any) {
    console.error("onMessage error", ex);
  }
};

const onCallback = async (ctx: OnCallBackQueryData) => {
  try {
    if (qrCodeBot.isSupportedEvent(ctx)) {
      await qrCodeBot.onEvent(ctx, (reason) => {
        logger.error(`qr generate error: ${reason}`);
      });
      return;
    }

    if (sdImagesBot.isSupportedEvent(ctx)) {
      await sdImagesBot.onEvent(ctx, (e) => {
        console.log(e, "// TODO refund payment");
      });
      return;
    }
  } catch (ex: any) {
    console.error("onMessage error", ex);
  }
};

bot.command(["start", "help", "menu"], async (ctx) => {
  const accountId = payments.getAccountId(ctx as OnMessageContext);
  const account = payments.getUserAccount(accountId);

  await assignFreeCredits(ctx as OnMessageContext);

  if (!account) {
    return false;
  }

  await writeCommandLog(ctx as OnMessageContext);

  const addressBalance = await payments.getAddressBalance(account.address);
  const credits = await chatService.getBalance(accountId);
  const balance = addressBalance.plus(credits);
  const balanceOne = payments.toONE(balance, false).toFixed(2);
  const startText = commandsHelpText.start
    .replaceAll("$CREDITS", balanceOne + "")
    .replaceAll("$WALLET_ADDRESS", account.address);

  await ctx.reply(startText, {
    parse_mode: "Markdown",
    reply_markup: mainMenu,
    disable_web_page_preview: true,
    message_thread_id: ctx.message?.message_thread_id,
  });
});

bot.command("more", async (ctx) => {
  writeCommandLog(ctx as OnMessageContext);
  return ctx.reply(commandsHelpText.more, {
    parse_mode: "Markdown",
    disable_web_page_preview: true,
    message_thread_id: ctx.message?.message_thread_id,
  });
});

bot.command("terms", (ctx) => {
  writeCommandLog(ctx as OnMessageContext);
  return ctx.reply(TERMS.text, {
    parse_mode: "Markdown",
    disable_web_page_preview: true,
    message_thread_id: ctx.message?.message_thread_id,
  });
});

bot.command("support", (ctx) => {
  writeCommandLog(ctx as OnMessageContext);
  return ctx.reply(SUPPORT.text, {
    parse_mode: "Markdown",
    disable_web_page_preview: true,
    message_thread_id: ctx.message?.message_thread_id,
  });
});

bot.command("models", (ctx) => {
  writeCommandLog(ctx as OnMessageContext);
  return ctx.reply(MODELS.text, {
    parse_mode: "Markdown",
    disable_web_page_preview: true,
  });
});

bot.command("feedback", (ctx) => {
  writeCommandLog(ctx as OnMessageContext);
  return ctx.reply(FEEDBACK.text, {
    parse_mode: "Markdown",
    disable_web_page_preview: true,
    message_thread_id: ctx.message?.message_thread_id,
  });
});

bot.command("love", (ctx) => {
  writeCommandLog(ctx as OnMessageContext);
  return ctx.reply(LOVE.text, {
    parse_mode: "Markdown",
    disable_web_page_preview: true,
    message_thread_id: ctx.message?.message_thread_id,
  });
});

bot.command("stop", (ctx) => {
  logger.info("/stop command");
  ctx.session.openAi.chatGpt.chatConversation = [];
  ctx.session.openAi.chatGpt.usage = 0;
  ctx.session.openAi.chatGpt.price = 0;
  ctx.session.translate.enable = false;
  ctx.session.translate.languages = [];
  ctx.session.oneCountry.lastDomain = "";
});
// bot.command("memo", (ctx) => {
//   ctx.reply(MEMO.text, {
//     parse_mode: "Markdown",
//     disable_web_page_preview: true,
//   });
// });

// bot.command("menu", async (ctx) => {
//   await ctx.reply(menuText.mainMenu.helpText, {
//     parse_mode: "Markdown",
//     reply_markup: mainMenu,
//   });
// });


// bot.on("msg:new_chat_members", async (ctx) => {
//   try {
//     const newMembers = (await ctx.message?.new_chat_members) || [];
//     newMembers.forEach(async (m) => {
//       const user = await getChatMemberInfo(m.username!);
//       if (user.displayName && user.displayName !== "undefined") {
//         await ctx.reply(
//           `Hi everyone! Welcome to ${user.displayName} (@${user.username})${
//             user.bio && ": " + user.bio
//           }`
//         );
//       }
//     });
//   } catch (e: any) {
//     logger.error(`Error when welcoming new chat memmber ${e.toString()}`);
//   }
// });


bot.on("message", onMessage);
bot.on("callback_query:data", onCallback);

bot.catch((err) => {
  const ctx = err.ctx;
  logger.error(`Error while handling update ${ctx.update.update_id}:`);
  const e = err.error;
  if (e instanceof GrammyError) {
    logger.error("Error in request:", e.description);
    logger.error(`Error in message: ${JSON.stringify(ctx.message)}`);
  } else if (e instanceof HttpError) {
    logger.error("Could not contact Telegram:", e);
  } else {
    logger.error("Unknown error:", e);
    console.error("global error others", err);
  }
  console.error("global error", err);
});

bot.errorBoundary((error) => {
  logger.error("### error", error);
});

const app = express();

app.use(express.json());
app.use(express.static("./public")); // Public directory, used in voice-memo bot

app.get("/health", (req, res) => {
  res.send("OK").end();
});

app.get("/metrics", async (req, res) => {
  res.setHeader("Content-Type", prometheusRegister.contentType);
  res.send(await prometheusRegister.metrics());
});

async function bootstrap() {
  const httpServer = app.listen(config.port, () => {
    logger.info(`Bot listening on port ${config.port}`);
    // bot.start({
    //   allowed_updates: ["callback_query"], // Needs to be set for menu middleware, but bot doesn't work with current configuration.
    // });
  });

  await AppDataSource.initialize();

  const prometheusMetrics = new PrometheusMetrics();
  await prometheusMetrics.bootstrap();

  const runner = run(bot);

  const stopApplication = async () => {
    console.warn("Terminating the bot...");

    try {
      await httpServer.close();
      console.warn("The HTTP server is turned off");

      if (runner && runner.isRunning()) {
        await runner.stop();
        console.warn("Bot runner is stopped");
      }

      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
        console.warn("Database is disconnected");
      }

      process.exit(0);
    } catch (ex) {
      console.error("An error occurred while terminating", ex);
      process.exit(1);
    }
  };

  process.on("SIGINT", stopApplication);
  process.on("SIGTERM", stopApplication);

  if (config.betteruptime.botHeartBitId) {
    const task = runBotHeartBit(runner, config.betteruptime.botHeartBitId);
    const stopHeartBit = () => {
      logger.info("heart bit stopping");
      task.stop();
    };
    process.once("SIGINT", stopHeartBit);
    process.once("SIGTERM", stopHeartBit);
  }
}

bootstrap();
