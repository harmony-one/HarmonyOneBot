import express from 'express'
import asyncHandler from 'express-async-handler'
import {
  Bot,
  type Enhance,
  GrammyError,
  HttpError,
  MemorySessionStorage,
  enhanceStorage,
  session, type NextFunction
} from 'grammy'
import { autoChatAction } from '@grammyjs/auto-chat-action'
import { limit } from '@grammyjs/ratelimiter'
import { pino } from 'pino'

import {
  type BotContext,
  type BotSessionData,
  type OnCallBackQueryData,
  type OnMessageContext, type RefundCallback
} from './modules/types'
import { mainMenu } from './pages'
import { TranslateBot } from './modules/translate/TranslateBot'
import { VoiceMemo } from './modules/voice-memo'
import { QRCodeBot } from './modules/qrcode/QRCodeBot'
import { SDImagesBot } from './modules/sd-images'
import { OpenAIBot } from './modules/open-ai'
import { OneCountryBot } from './modules/1country'
import { WalletConnect } from './modules/walletconnect'
import { BotPayments } from './modules/payment'
import { BotSchedule } from './modules/schedule'
import { LlmsBot } from './modules/llms'
import { DocumentHandler } from './modules/document-handler'
import config from './config'
import {
  commandsHelpText,
  TERMS,
  SUPPORT,
  FEEDBACK,
  LOVE,
  MODELS
} from './constants'
import prometheusRegister, { PrometheusMetrics } from './metrics/prometheus'

import { chatService, statsService } from './database/services'
import { AppDataSource } from './database/datasource'
import { autoRetry } from '@grammyjs/auto-retry'
import { run } from '@grammyjs/runner'
import { runBotHeartBit } from './monitoring/monitoring'
import { type BotPaymentLog } from './database/stats.service'
// import { getChatMemberInfo } from './modules/open-ai/utils/web-crawler'
import { TelegramPayments } from './modules/telegram_payment'
import * as Sentry from '@sentry/node'
import * as Events from 'events'
import { ProfilingIntegration } from '@sentry/profiling-node'

Events.EventEmitter.defaultMaxListeners = 30

const logger = pino({
  name: 'bot',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
})

export const bot = new Bot<BotContext>(config.telegramBotAuthToken)
bot.api.config.use(autoRetry())

bot.use(
  limit({
    // Allow only 3 message to be handled every 3 seconds.
    timeFrame: 3000,
    limit: 3,

    // This is called when the limit is exceeded.
    onLimitExceeded: (ctx): void => {
      // await ctx.reply("Please refrain from sending too many requests")
      logger.error(`@${ctx.from?.username} has exceeded the message limit`)
      // await ctx.reply("");
    },

    // Note that the key should be a number in string format such as "123456789".
    keyGenerator: (ctx) => {
      return ctx.from?.id.toString()
    }
  })
)

Sentry.init({
  dsn: config.sentry.dsn,
  integrations: [
    new ProfilingIntegration()
  ],
  tracesSampleRate: 1.0, // Performance Monitoring. Should use 0.1 in production
  profilesSampleRate: 1.0 // Set sampling rate for profiling - this is relative to tracesSampleRate
})
bot.use(async (ctx: BotContext, next: NextFunction): Promise<void> => {
  const transaction = Sentry.startTransaction({ name: 'bot-command' })
  const entities = ctx.entities()
  for (const ent of entities) {
    if (ent.type === 'bot_command') {
      const command = ent.text.substring(1)
      const userId = ctx.message?.from?.id
      if (userId) {
        Sentry.setUser({ id: userId })
      }
      if (command) {
        Sentry.setTag('command', command)
      }
      // there should be only one bot command
      break
    }
  }
  await next()
  transaction.finish()
})

function createInitialSessionData (): BotSessionData {
  return {
    openAi: {
      imageGen: {
        numImages: config.openAi.dalle.sessionDefault.numImages,
        imgSize: config.openAi.dalle.sessionDefault.imgSize,
        isEnabled: config.openAi.dalle.isEnabled
      },
      chatGpt: {
        model: config.openAi.chatGpt.model,
        isEnabled: config.openAi.chatGpt.isEnabled,
        chatConversation: [],
        price: 0,
        usage: 0,
        isProcessingQueue: false,
        requestQueue: []
      }
    },
    oneCountry: { lastDomain: '' },
    translate: {
      languages: [],
      enable: false
    },
    llms: {
      model: config.llms.model,
      isEnabled: config.llms.isEnabled,
      chatConversation: [],
      price: 0,
      usage: 0,
      isProcessingQueue: false,
      requestQueue: []
    }
  }
}

bot.use(
  session({
    initial: createInitialSessionData,
    storage: enhanceStorage<BotSessionData>({
      storage: new MemorySessionStorage<Enhance<BotSessionData>>(),
      millisecondsToLive: config.sessionTimeout * 60 * 60 * 1000 // 48 hours
    })
  })
)
bot.use(autoChatAction())
bot.use(mainMenu)

const voiceMemo = new VoiceMemo()
const qrCodeBot = new QRCodeBot()
const sdImagesBot = new SDImagesBot()
const walletConnect = new WalletConnect()
const payments = new BotPayments()
const schedule = new BotSchedule(bot)
const openAiBot = new OpenAIBot(payments)
const oneCountryBot = new OneCountryBot()
const translateBot = new TranslateBot()
const llmsBot = new LlmsBot(payments)
const documentBot = new DocumentHandler()
const telegramPayments = new TelegramPayments(payments)

bot.on('message:new_chat_members:me', async (ctx) => {
  try {
    const accountId = payments.getAccountId(ctx as OnMessageContext)

    const chat = await chatService.getAccountById(accountId)

    if (chat) {
      return
    }

    const tgUserId = ctx.message.from.id
    const tgUsername = ctx.message.from.username ?? ''

    await chatService.initChat({ tgUserId, accountId, tgUsername })
  } catch (err) {
    logger.info(`Create chat error ${err}`)
  }
})

const assignFreeCredits = async (ctx: OnMessageContext): Promise<boolean> => {
  const { chat } = ctx.update.message

  const accountId = payments.getAccountId(ctx)
  let tgUserId = accountId
  let tgUsername = ''

  const isCreditsAssigned = await chatService.isCreditsAssigned(accountId)
  if (isCreditsAssigned) {
    return true
  }

  try {
    if (chat.type === 'group') {
      const members = await ctx.getChatAdministrators()
      const creator = members.find((member) => member.status === 'creator')
      if (creator) {
        tgUserId = creator.user.id
        tgUsername = creator.user.username ?? ''
      }
    }

    await chatService.initChat({ accountId, tgUserId, tgUsername })
    // logger.info(`credits transferred to accountId ${accountId} chat ${chat.type} ${chat.id}`)
  } catch (e) {
    logger.error(
      `Cannot check account ${accountId} credits: ${(e as Error).message}`
    )
  }
  return true
}

bot.use(async (ctx, next) => {
  const entities = ctx.entities()

  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i]
    if (entity.type === 'bot_command' && ctx.message) {
      const tgUserId = ctx.message.from.id
      statsService.addCommandStat({
        tgUserId,
        command: entity.text.replace('/', ''),
        rawMessage: ''
      }).catch((ex: any) => {
        logger.error('Error logging stats', ex)
      })
    }
  }

  await next()
})

const writeCommandLog = async (
  ctx: OnMessageContext,
  isSupportedCommand = true
): Promise<void> => {
  const { from, text = '', chat } = ctx.update.message

  try {
    const accountId = payments.getAccountId(ctx)
    const [command] = text?.split(' ') ?? []

    const log: BotPaymentLog = {
      tgUserId: from.id,
      accountId,
      command,
      groupId: chat.id,
      isPrivate: chat.type === 'private',
      message: text,
      isSupportedCommand,
      amountCredits: 0,
      amountOne: 0,
      amountFiatCredits: 0
    }
    await statsService.writeLog(log)
  } catch (e) {
    logger.error(
      `Cannot write unsupported command log: ${(e as Error).message}`
    )
  }
}

interface PayableBot {
  getEstimatedPrice: (ctx: OnMessageContext) => number
  isSupportedEvent: (ctx: OnMessageContext) => boolean
  onEvent: (ctx: OnMessageContext, refundCallback: RefundCallback) => Promise<any>
}
interface UtilityBot {
  isSupportedEvent: (ctx: OnMessageContext) => boolean
  onEvent: (ctx: OnMessageContext) => Promise<any>
}
interface PayableBotConfig {
  bot: PayableBot
  enabled?: (ctx: OnMessageContext) => boolean
}

const PayableBots: Record<string, PayableBotConfig> = {
  qrCodeBot: { bot: qrCodeBot },
  sdImagesBot: { bot: sdImagesBot },
  voiceMemo: { bot: voiceMemo },
  documentBot: { bot: documentBot },
  translateBot: { bot: translateBot },
  openAiBot: {
    enabled: (ctx: OnMessageContext) => ctx.session.openAi.imageGen.isEnabled,
    bot: openAiBot
  },
  llmsBot: {
    enabled: (ctx: OnMessageContext) => ctx.session.openAi.imageGen.isEnabled,
    bot: llmsBot
  },
  oneCountryBot: { bot: oneCountryBot }
}

const UtilityBots: Record<string, UtilityBot> = {
  walletConnect,
  payments,
  schedule
}

const executeOrRefund = (ctx: OnMessageContext, price: number, bot: PayableBot): void => {
  const refund = (reason?: string): void => {}
  bot.onEvent(ctx, refund).catch((ex: any) => {
    logger.error(ex?.message ?? 'Unknown error')
  })
}

const onMessage = async (ctx: OnMessageContext): Promise<void> => {
  try {
    // bot doesn't handle forwarded messages
    if (!ctx.message.forward_from) {
      await assignFreeCredits(ctx)

      if (telegramPayments.isSupportedEvent(ctx)) {
        await telegramPayments.onEvent(ctx)
        return
      }

      for (const config of Object.values(PayableBots)) {
        const bot = config.bot

        if (!bot.isSupportedEvent(ctx)) {
          continue
        }
        if (config.enabled && !config.enabled(ctx)) {
          await ctx.reply('Bot disabled', { message_thread_id: ctx.message?.message_thread_id })
          return
        }
        const price = bot.getEstimatedPrice(ctx)
        const isPaid = await payments.pay(ctx, price)
        if (isPaid) {
          executeOrRefund(ctx, price, bot)
        }
        return
      }
      for (const bot of Object.values(UtilityBots)) {
        if (!bot.isSupportedEvent(ctx)) {
          continue
        }
        await bot.onEvent(ctx)
        return
      }
      // Any message interacts with ChatGPT (only for private chats)
      if (ctx.update.message.chat && ctx.chat.type === 'private') {
        await openAiBot.onEvent(ctx)
        return
      }
      if (ctx.update.message.chat) {
        logger.info(`Received message in chat id: ${ctx.update.message.chat.id}`)
      }
      await writeCommandLog(ctx, false)
    }
  } catch (ex: any) {
    logger.error('onMessage error', ex)
  }
}

const onCallback = async (ctx: OnCallBackQueryData): Promise<void> => {
  try {
    if (qrCodeBot.isSupportedEvent(ctx)) {
      await qrCodeBot.onEvent(ctx, (reason) => {
        logger.error(`qr generate error: ${reason}`)
      })
      return
    }

    if (sdImagesBot.isSupportedEvent(ctx)) {
      await sdImagesBot.onEvent(ctx, (e) => {
        logger.info(e, '// TODO refund payment')
      })
    }
  } catch (ex: any) {
    logger.error('onMessage error', ex)
  }
}

bot.command(['start', 'help', 'menu'], async (ctx) => {
  const accountId = payments.getAccountId(ctx as OnMessageContext)
  const account = payments.getUserAccount(accountId)

  await assignFreeCredits(ctx as OnMessageContext)

  if (!account) {
    return false
  }

  await writeCommandLog(ctx as OnMessageContext)

  const addressBalance = await payments.getAddressBalance(account.address)
  const { totalCreditsAmount } = await chatService.getUserCredits(accountId)
  const balance = addressBalance.plus(totalCreditsAmount)
  const balanceOne = payments.toONE(balance, false).toFixed(2)
  const startText = commandsHelpText.start
    .replaceAll('$CREDITS', balanceOne + '')
    .replaceAll('$WALLET_ADDRESS', account.address)

  await ctx.reply(startText, {
    parse_mode: 'Markdown',
    reply_markup: mainMenu,
    disable_web_page_preview: true,
    message_thread_id: ctx.message?.message_thread_id
  })
})

bot.command('more', async (ctx) => {
  writeCommandLog(ctx as OnMessageContext).catch(logger.error)
  return await ctx.reply(commandsHelpText.more, {
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
    message_thread_id: ctx.message?.message_thread_id
  })
})

bot.command('terms', async (ctx) => {
  writeCommandLog(ctx as OnMessageContext).catch(logger.error)
  return await ctx.reply(TERMS.text, {
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
    message_thread_id: ctx.message?.message_thread_id
  })
})

bot.command('support', async (ctx) => {
  writeCommandLog(ctx as OnMessageContext).catch(logger.error)
  return await ctx.reply(SUPPORT.text, {
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
    message_thread_id: ctx.message?.message_thread_id
  })
})

bot.command('models', async (ctx) => {
  writeCommandLog(ctx as OnMessageContext).catch(logger.error)
  return await ctx.reply(MODELS.text, {
    parse_mode: 'Markdown',
    disable_web_page_preview: true
  })
})

bot.command('feedback', async (ctx) => {
  writeCommandLog(ctx as OnMessageContext).catch(logger.error)
  return await ctx.reply(FEEDBACK.text, {
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
    message_thread_id: ctx.message?.message_thread_id
  })
})

bot.command('love', async (ctx) => {
  writeCommandLog(ctx as OnMessageContext).catch(logger.error)
  return await ctx.reply(LOVE.text, {
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
    message_thread_id: ctx.message?.message_thread_id
  })
})

bot.command('stop', (ctx) => {
  logger.info('/stop command')
  ctx.session.openAi.chatGpt.chatConversation = []
  ctx.session.openAi.chatGpt.usage = 0
  ctx.session.openAi.chatGpt.price = 0
  ctx.session.translate.enable = false
  ctx.session.translate.languages = []
  ctx.session.oneCountry.lastDomain = ''
  ctx.session.llms.chatConversation = []
  ctx.session.llms.usage = 0
  ctx.session.llms.price = 0
})
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

bot.on('message', onMessage)
bot.on('callback_query:data', onCallback)
bot.on('pre_checkout_query', async (ctx) => { await telegramPayments.onPreCheckout(ctx) })

bot.catch((err) => {
  const ctx = err.ctx
  logger.error(`Error while handling update ${ctx.update.update_id}:`)
  const e = err.error
  if (e instanceof GrammyError) {
    logger.error('Error in request:', e.description)
    logger.error(`Error in message: ${JSON.stringify(ctx.message)}`)
  } else if (e instanceof HttpError) {
    logger.error('Could not contact Telegram:', e)
  } else {
    logger.error('Unknown error:', e)
    logger.error('global error others', err)
  }
  logger.error('global error', err)
})

bot.errorBoundary((error) => {
  logger.error('### error', error)
})

const app = express()

app.use(express.json())
app.use(express.static('./public')) // Public directory, used in voice-memo bot

app.get('/health', (req, res) => {
  res.send('OK').end()
})

app.get('/metrics', asyncHandler(async (req, res): Promise<void> => {
  res.setHeader('Content-Type', prometheusRegister.contentType)
  res.send(await prometheusRegister.metrics()).end()
}))

async function bootstrap (): Promise<void> {
  const httpServer = app.listen(config.port, () => {
    logger.info(`Bot listening on port ${config.port}`)
    // bot.start({
    //   allowed_updates: ["callback_query"], // Needs to be set for menu middleware, but bot doesn't work with current configuration.
    // });
  })

  await AppDataSource.initialize()
  payments.bootstrap()

  const prometheusMetrics = new PrometheusMetrics()
  await prometheusMetrics.bootstrap()

  const runner = run(bot)

  const stopApplication = async (): Promise<void> => {
    console.warn('Terminating the bot...')

    try {
      httpServer.close()
      console.warn('The HTTP server is turned off')

      if (runner && runner.isRunning()) {
        await runner.stop()
        console.warn('Bot runner is stopped')
      }

      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy()
        console.warn('Database is disconnected')
      }

      process.exit(0)
    } catch (ex) {
      console.error('An error occurred while terminating', ex)
      process.exit(1)
    }
  }

  process.on('SIGINT', () => { stopApplication().catch(logger.error) })
  process.on('SIGTERM', () => { stopApplication().catch(logger.error) })

  if (config.betteruptime.botHeartBitId) {
    const task = await runBotHeartBit(runner, config.betteruptime.botHeartBitId)
    const stopHeartBit = (): void => {
      logger.info('heart bit stopping')
      // task.stop()
    }
    process.once('SIGINT', stopHeartBit)
    process.once('SIGTERM', stopHeartBit)
  }
}

bootstrap().catch((error) => {
  console.error(`bot bootstrap error ${error}`)
  process.exit(1)
})
