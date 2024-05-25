import express from 'express'
import asyncHandler from 'express-async-handler'
import {
  Bot,
  type Enhance,
  enhanceStorage,
  GrammyError,
  HttpError,
  MemorySessionStorage,
  type NextFunction,
  session
} from 'grammy'
import { autoChatAction } from '@grammyjs/auto-chat-action'
import { limit } from '@grammyjs/ratelimiter'
import { pino } from 'pino'

import {
  type BotContext,
  type BotSessionData,
  type OnCallBackQueryData,
  type OnMessageContext, type PayableBot, type PayableBotConfig,
  RequestState, type UtilityBot
} from './modules/types'
import { mainMenu } from './pages'
import { TranslateBot } from './modules/translate/TranslateBot'
import { VoiceMemo } from './modules/voice-memo'
// import { QRCodeBot } from './modules/qrcode/QRCodeBot'
// import { SDImagesBot } from './modules/sd-images'
// import { OpenAIBot } from './modules/open-ai'
import { DalleBot, OpenAIBot, ClaudeBot, VertexBot } from './modules/llms'

import { OneCountryBot } from './modules/1country'
import { WalletConnect } from './modules/walletconnect'
import { BotPayments } from './modules/payment'
import { BotSchedule } from './modules/schedule'
import config from './config'
import { commandsHelpText, FEEDBACK, LOVE, MODELS, SUPPORT, TERMS, LANG, ALIAS } from './constants'
import prometheusRegister, { PrometheusMetrics } from './metrics/prometheus'

import { chatService, statsService } from './database/services'
import { AppDataSource } from './database/datasource'
import { autoRetry } from '@grammyjs/auto-retry'
import { run } from '@grammyjs/runner'
import { runBotHeartBit } from './monitoring/monitoring'
import { type BotPaymentLog } from './database/stats.service'
import { TelegramPayments } from './modules/telegram_payment'
import * as Sentry from '@sentry/node'
import * as Events from 'events'
import { ProfilingIntegration } from '@sentry/profiling-node'
import { ES } from './es'
import { hydrateFiles } from '@grammyjs/files'
import { VoiceTranslateBot } from './modules/voice-translate'
import { TextToSpeechBot } from './modules/text-to-speech'
import { VoiceToTextBot } from './modules/voice-to-text'
import { now } from './utils/perf'
import { VoiceToVoiceGPTBot } from './modules/voice-to-voice-gpt'
// import { VoiceCommand } from './modules/voice-command'
import { createInitialSessionData } from './helpers'
import { LlamaAgent } from './modules/subagents'

Events.EventEmitter.defaultMaxListeners = 30

const logger = pino({
  name: 'bot',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
})

export const bot = new Bot<BotContext>(config.telegramBotAuthToken)
bot.api.config.use(hydrateFiles(bot.token))
bot.api.config.use(autoRetry())

bot.use(
  limit({
    // Allow only 3 message to be handled every 3 seconds.
    timeFrame: 3000,
    limit: 10,

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
  release: config.commitHash,
  integrations: [
    new ProfilingIntegration()
  ],
  tracesSampleRate: 1.0, // Performance Monitoring. Should use 0.1 in production
  profilesSampleRate: 1.0 // Set sampling rate for profiling - this is relative to tracesSampleRate
})

Sentry.setTags({ botName: config.botName })

ES.init()

bot.use(async (ctx: BotContext, next: NextFunction): Promise<void> => {
  ctx.transient = {
    refunded: false,
    analytics: {
      module: '',
      firstResponseTime: 0n,
      actualResponseTime: 0n,
      sessionState: RequestState.Initial
    },
    payment: {
      paymentTotal: 0,
      paymentFreeCredits: 0,
      paymentOneCredits: 0,
      paymentFiatCredits: 0
    }
  }
  const transaction = Sentry.startTransaction({ name: 'bot-command' })
  const entities = ctx.entities()
  const startTime = now()
  let command = ''
  for (const ent of entities) {
    if (ent.type === 'bot_command') {
      command = ent.text.substring(1)
      const userId = ctx.message?.from?.id
      const username = ctx.message?.from?.username
      if (userId) {
        Sentry.setUser({ id: userId, username })
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

  if (ctx.transient.analytics.module) {
    const userId = Number(ctx.message?.from?.id ?? '0')
    const username = ctx.message?.from?.username ?? ''
    if (!ctx.transient.analytics.actualResponseTime) {
      ctx.transient.analytics.actualResponseTime = now()
    }
    if (!ctx.transient.analytics.firstResponseTime) {
      ctx.transient.analytics.firstResponseTime = ctx.transient.analytics.actualResponseTime
    }
    const totalProcessingTime = (now() - startTime).toString()
    const firstResponseTime = (ctx.transient.analytics.firstResponseTime - startTime).toString()
    const actualResponseTime = (ctx.transient.analytics.actualResponseTime - startTime).toString()

    const { paymentTotal, paymentFreeCredits, paymentOneCredits, paymentFiatCredits } = ctx.transient.payment

    ES.add({
      command,
      text: ctx.message?.text ?? '',
      module: ctx.transient.analytics.module,
      userId,
      username,
      firstResponseTime,
      actualResponseTime,
      refunded: ctx.transient.refunded,
      sessionState: ctx.transient.analytics.sessionState,
      totalProcessingTime,
      paymentTotal,
      paymentFreeCredits,
      paymentOneCredits,
      paymentFiatCredits
    }).catch((ex: any) => {
      logger.error({ errorMsg: ex.message }, 'Failed to add data to ES')
    })
  }
})

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
// const qrCodeBot = new QRCodeBot()
// const sdImagesBot = new SDImagesBot()
const walletConnect = new WalletConnect()
const payments = new BotPayments()
const schedule = new BotSchedule(bot)
const llamaAgent = new LlamaAgent(payments, 'llamaService')
const openAiBot = new OpenAIBot(payments, [llamaAgent])
const dalleBot = new DalleBot(payments)
const claudeBot = new ClaudeBot(payments)
const vertexBot = new VertexBot(payments, [llamaAgent])
const oneCountryBot = new OneCountryBot(payments)
const translateBot = new TranslateBot()
const telegramPayments = new TelegramPayments(payments)
const voiceTranslateBot = new VoiceTranslateBot(payments)
const textToSpeechBot = new TextToSpeechBot(payments)
const voiceToTextBot = new VoiceToTextBot(payments)
const voiceToVoiceGPTBot = new VoiceToVoiceGPTBot(payments)

// const voiceCommand = new VoiceCommand(openAiBot)

bot.on('message:new_chat_members:me', async (ctx) => {
  try {
    const accountId = payments.getAccountId(ctx)

    const chat = await chatService.getAccountById(accountId)

    if (chat) {
      return
    }

    const tgUserId = ctx.message.from.id
    const tgUsername = ctx.message.from.username ?? ''

    await chatService.initChat({ tgUserId, accountId, tgUsername })
  } catch (ex) {
    Sentry.captureException(ex)
    logger.error('Create chat error', ex)
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
    Sentry.captureException(e)
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
        Sentry.captureException(ex)
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
    Sentry.captureException(e)
    logger.error(
      `Cannot write unsupported command log: ${(e as Error).message}`
    )
  }
}

const PayableBots: Record<string, PayableBotConfig> = {
  // voiceCommand: { bot: voiceCommand },
  // qrCodeBot: { bot: qrCodeBot },
  // sdImagesBot: { bot: sdImagesBot },
  voiceTranslate: { bot: voiceTranslateBot },
  voiceMemo: { bot: voiceMemo },
  translateBot: { bot: translateBot },
  textToSpeech: { bot: textToSpeechBot },
  voiceToVoiceGPTBot: { bot: voiceToVoiceGPTBot },
  voiceToText: { bot: voiceToTextBot },
  dalleBot: { bot: dalleBot },
  claudeBot: { bot: claudeBot },
  vertexBot: { bot: vertexBot },
  openAiBot: {
    enabled: (ctx: OnMessageContext) => ctx.session.dalle.isEnabled,
    bot: openAiBot
  },
  oneCountryBot: { bot: oneCountryBot }
}

const UtilityBots: Record<string, UtilityBot> = {
  walletConnect,
  payments,
  schedule
}

const executeOrRefund = async (ctx: OnMessageContext, price: number, bot: PayableBot): Promise<void> => {
  const refund = (reason?: string): void => {}
  await bot.onEvent(ctx, refund).catch((ex: any) => {
    Sentry.captureException(ex)
    logger.error(ex?.message ?? 'Unknown error')
  })
}

const onMessage = async (ctx: OnMessageContext): Promise<void> => {
  try {
    // bot doesn't handle forwarded messages
    if (!ctx.message.forward_origin) {
      await assignFreeCredits(ctx)

      if (llamaAgent.isSupportedEvent(ctx)) {
        await llamaAgent.onEvent(ctx)
        return
      }

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
          logger.info(`command controller: ${bot.constructor.name}`)
          await executeOrRefund(ctx, price, bot)
        }
        return
      }
      for (const bot of Object.values(UtilityBots)) {
        if (!bot.isSupportedEvent(ctx)) {
          continue
        }
        logger.info(`command controller: ${bot.constructor.name}`)
        await bot.onEvent(ctx)
        return
      }
      // Any message interacts with ChatGPT (only for private chats or /ask on enabled on group chats)
      if (ctx.update.message.chat && (ctx.chat.type === 'private' || ctx.session.chatGpt.isFreePromptChatGroups)) {
        await openAiBot.onEvent(ctx, (e) => {
          logger.error(e)
        })
        return
      }
      if (ctx.update.message.chat) {
        logger.info(`Received message in chat id: ${ctx.update.message.chat.id}`)
      }
      await writeCommandLog(ctx, false)
    }
  } catch (ex: any) {
    Sentry.captureException(ex)
    logger.error({ errorMsg: ex.message }, 'onMessage error')
  }
}

const onCallback = async (ctx: OnCallBackQueryData): Promise<void> => {
  try {
    // if (qrCodeBot.isSupportedEvent(ctx)) {
    //   await qrCodeBot.onEvent(ctx, (reason) => {
    //     logger.error(`qr generate error: ${reason}`)
    //   })
    //   return
    // }

    if (telegramPayments.isSupportedEvent(ctx)) {
      await telegramPayments.onEvent(ctx)
      return
    }

    // if (sdImagesBot.isSupportedEvent(ctx)) {
    //   await sdImagesBot.onEvent(ctx, (e) => {
    //     logger.info(e, '// TODO refund payment')
    //   })
    //   return
    // }

    if (dalleBot.isSupportedEvent(ctx)) {
      await dalleBot.onEvent(ctx, (e) => {
        logger.error(e)
      })
    }
  } catch (ex: any) {
    Sentry.captureException(ex)
    logger.error({ errorMsg: ex.message }, 'onCallback error')
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
    link_preview_options: { is_disabled: true },
    message_thread_id: ctx.message?.message_thread_id
  })
})

const logErrorHandler = (ex: any): void => {
  Sentry.captureException(ex)
  logger.error(ex)
}

bot.command('more', async (ctx) => {
  writeCommandLog(ctx as OnMessageContext).catch(logErrorHandler)
  return await ctx.reply(commandsHelpText.more, {
    parse_mode: 'Markdown',
    link_preview_options: { is_disabled: true },
    message_thread_id: ctx.message?.message_thread_id
  })
})

bot.command('terms', async (ctx) => {
  writeCommandLog(ctx as OnMessageContext).catch(logErrorHandler)
  return await ctx.reply(TERMS.text, {
    parse_mode: 'Markdown',
    link_preview_options: { is_disabled: true },
    message_thread_id: ctx.message?.message_thread_id
  })
})

bot.command('support', async (ctx) => {
  writeCommandLog(ctx as OnMessageContext).catch(logErrorHandler)
  return await ctx.reply(SUPPORT.text, {
    parse_mode: 'Markdown',
    link_preview_options: { is_disabled: true },
    message_thread_id: ctx.message?.message_thread_id
  })
})

bot.command('models', async (ctx) => {
  writeCommandLog(ctx as OnMessageContext).catch(logErrorHandler)
  return await ctx.reply(MODELS.text, {
    parse_mode: 'Markdown',
    link_preview_options: { is_disabled: true }
  })
})

bot.command('lang', async (ctx) => {
  writeCommandLog(ctx as OnMessageContext).catch(logErrorHandler)
  return await ctx.reply(LANG.text, {
    parse_mode: 'Markdown',
    link_preview_options: { is_disabled: true }
  })
})

bot.command('feedback', async (ctx) => {
  writeCommandLog(ctx as OnMessageContext).catch(logErrorHandler)
  return await ctx.reply(FEEDBACK.text, {
    parse_mode: 'Markdown',
    link_preview_options: { is_disabled: true },
    message_thread_id: ctx.message?.message_thread_id
  })
})

bot.command('love', async (ctx) => {
  writeCommandLog(ctx as OnMessageContext).catch(logErrorHandler)
  return await ctx.reply(LOVE.text, {
    parse_mode: 'Markdown',
    link_preview_options: { is_disabled: true },
    message_thread_id: ctx.message?.message_thread_id
  })
})

bot.command('stop', async (ctx) => {
  logger.info('/stop command')
  await openAiBot.onStop(ctx as OnMessageContext)
  await claudeBot.onStop(ctx as OnMessageContext)
  ctx.session.translate.enable = false
  ctx.session.translate.languages = []
  ctx.session.oneCountry.lastDomain = ''
})

bot.command(['alias', 'aliases'], async (ctx) => {
  logger.info('/alias command')
  return await ctx.reply(ALIAS.text, {
    parse_mode: 'Markdown',
    link_preview_options: { is_disabled: true },
    message_thread_id: ctx.message?.message_thread_id
  })
})

// bot.command(['end'], async (ctx) => {
//   logger.info('/end command')
//   return await ctx.reply(ALIAS.text, {
//     parse_mode: 'Markdown',
//     link_preview_options: { is_disabled: true },
//     message_thread_id: ctx.message?.message_thread_id
//   })
// })

// bot.command("memo", (ctx) => {
//   ctx.reply(MEMO.text, {
//     parse_mode: "Markdown",
//     link_preview_options: { is_disabled: true },
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
  } else if (e instanceof Error) {
    logger.error({ errorMsg: e.message }, 'Unknown error')
    logger.error({ error: err }, 'global error others')
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
      Sentry.captureException(ex)
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
      task.stop()
    }
    process.once('SIGINT', stopHeartBit)
    process.once('SIGTERM', stopHeartBit)
  }
}

bootstrap().catch((error) => {
  logger.error(`bot bootstrap error ${error}`)
  process.exit(1)
})
