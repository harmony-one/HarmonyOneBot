import pino from "pino";
import { Bot } from 'grammy'
import cron from 'node-cron'
import { LRUCache } from 'lru-cache'
import config from '../../config'
import {BotContext, OnMessageContext} from "../types";
import {getFeeStats} from "./explorerApi";
import {getBotFeeStats} from "./harmonyApi";
import {getBridgeStats} from "./bridgeAPI";
import {statsService} from "../../database/services";

enum SupportedCommands {
  BOT_STATS = 'botstats',
  STATS = 'stats',
  ALL_STATS = 'allstats'
}

export class BotSchedule {
  private readonly holderAddress = config.payment.holderAddress
  private bot: Bot<BotContext>
  private logger = pino({
    name: 'Schedule',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true
      }
    }
  })

  private cache = new LRUCache({ max: 100, ttl: 1000 * 60 * 60 * 2 })
  private reportMessage = ''

  constructor(bot: Bot<BotContext>) {
    this.bot = bot

    if(config.schedule.isEnabled) {
      if(config.schedule.chatId) {
        this.runCronJob()
      } else {
        this.logger.info(`No chatId defined. Set [SCHEDULE_CHAT_ID] variable.`)
      }
    } else {
      this.logger.info(`Scheduled metrics is disabled. Set [SCHEDULE_IS_ENABLED=1] to enable.`)
    }

  }

  private async prepareMetricsUpdate(refetchData = false) {
    try {
      this.logger.info(`Start preparing stats`)

      const networkFeeStats = await getFeeStats()
      const networkFeesReport = `*${networkFeeStats.value}* ONE (${networkFeeStats.change}%)`

      let bridgeStatsReport = this.cache.get('bridge_report') || ''
      this.logger.info(`Bridge stats report from cache: "${bridgeStatsReport}"`)
      if(refetchData || !bridgeStatsReport) {
        const bridgeStats = await getBridgeStats()
        bridgeStatsReport =  `*${bridgeStats.value}* USD (${bridgeStats.change}%)`
        this.cache.set('bridge_report', bridgeStatsReport)
      }

      const botFeesReport = await this.getBotFeeReport(this.holderAddress);

      const reportMessage =
        `\nNetwork fees (7-day growth): ${networkFeesReport}` +
        `\nBridge flow: ${bridgeStatsReport}` +
        `\nBot fees: ${botFeesReport}`

      this.logger.info(`Prepared message: "${reportMessage}"`)
      this.reportMessage = reportMessage
      return reportMessage
    } catch (e) {
      console.log('### e', e);
      this.logger.error(`Cannot get stats: ${(e as Error).message}`)
    }
  }

  private async postMetricsUpdate() {
    const scheduleChatId = config.schedule.chatId
    if(!scheduleChatId) {
      this.logger.error(`Post updates: no chatId defined. Set [SCHEDULE_CHAT_ID] variable.`)
      return
    }

    if(this.reportMessage) {
      await this.bot.api.sendMessage(scheduleChatId, this.reportMessage, {
        parse_mode: "Markdown",
      })
      this.logger.info(`Daily metrics posted in chat ${scheduleChatId}: ${this.reportMessage}`)
    }
  }

  private async runCronJob() {
    const task1 = cron.schedule('30 17 * * *', () => {
      this.prepareMetricsUpdate(true)
    }, {
      scheduled: true,
      timezone: "Europe/Lisbon"
    });

    const task2 = cron.schedule('00 18 * * *', () => {
      this.logger.info('Posting daily metrics')
      this.postMetricsUpdate()
    }, {
      scheduled: true,
      timezone: "Europe/Lisbon"
    });

    process.once("SIGINT", () => {
      task1.stop();
      task2.stop();
    });
    process.once("SIGTERM", () => {
      task1.stop();
      task2.stop();
    });

    await this.prepareMetricsUpdate()
    // await this.postMetricsUpdate()
  }

  public isSupportedEvent(ctx: OnMessageContext) {
    return config.schedule.isEnabled && ctx.hasCommand(Object.values(SupportedCommands));
  }

  public async getBotFeeReport(address: string): Promise<string> {
    const botFees = await getBotFeeStats(this.holderAddress)
    return `*${botFees.value}* ONE (${botFees.change}%)`
  }

  public async generateAllStatsReport() {
    const [totalOne, botFeesReport, dau, mau, weu] = await Promise.all([
      statsService.getTotalONE(),
      this.getBotFeeReport(this.holderAddress),
      statsService.getDAU(),
      statsService.getMAU(),
      statsService.getWEUunfiltered(),
    ])

    const report =
      `\nTotal ONE: *${totalOne.toFixed()}*` +
      `\nBot fees: ${botFeesReport}` +
      `\nDaily Active Users: *${dau}*` +
      `\nMonthly Active Users: *${mau}*` +
      `\nWeekly User Engagement: *${weu}*`
    return report;
  }

  public async generateStatsReport() {
    const [totalOne, dau, weu] = await Promise.all([
      statsService.getTotalONE(),
      statsService.getWAU(),
      statsService.getWEU(),
    ])

    const report = `\nTotal ONE: *${totalOne.toFixed()}*` +
      `\nWeekly Active Users: *${dau}*` +
      `\nWeekly User Engagement: *${weu}*`;
    return report;
  }

  public async onEvent(ctx: OnMessageContext) {
    const { message_id } = ctx.update.message

    if(ctx.hasCommand(SupportedCommands.BOT_STATS)) {
      const report = await this.prepareMetricsUpdate()
      if(report) {
        await ctx.reply(report, {
          parse_mode: "Markdown",
        });
      }
    }

    if (ctx.hasCommand(SupportedCommands.ALL_STATS)) {
      const report = await this.generateAllStatsReport()
      await ctx.reply(report, {
        parse_mode: "Markdown",
      });
    }

    if (ctx.hasCommand(SupportedCommands.STATS)) {
      const report = await this.generateStatsReport()
      console.log('### report', report);
      await ctx.reply(report, {
        parse_mode: "Markdown",
      });
    }
  }
}
