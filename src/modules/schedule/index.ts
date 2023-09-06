import pino from "pino";
import { Bot } from 'grammy'
import cron from 'node-cron'
import { LRUCache } from 'lru-cache'
import config from '../../config'
import {BotContext, OnMessageContext} from "../types";
import {getFeeStats} from "./explorerApi";
import {getAddressBalance, getBotFee, getBotFeeStats} from "./harmonyApi";
import {getBridgeStats} from "./bridgeAPI";
import {statsService} from "../../database/services";
import {abbreviateNumber} from "./utils";

enum SupportedCommands {
  BOT_STATS = 'botstats',
  STATS = 'stats',
  ALL_STATS = 'allstats'
}

interface BotFeesReport {
  daily: string;
  weekly: string;
  monthly: string;
  change: string;
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
    cron.schedule('30 17 * * *', () => {
      this.prepareMetricsUpdate(true)
    }, {
      scheduled: true,
      timezone: "Europe/Lisbon"
    });

    cron.schedule('00 18 * * *', () => {
      this.logger.info('Posting daily metrics')
      this.postMetricsUpdate()
    }, {
      scheduled: true,
      timezone: "Europe/Lisbon"
    });

    await this.prepareMetricsUpdate()
    // await this.postMetricsUpdate()
  }

  public isSupportedEvent(ctx: OnMessageContext) {
    return config.schedule.isEnabled && ctx.hasCommand(Object.values(SupportedCommands));
  }

  public async getBotFeeReport(address: string): Promise<object> {
    const botFees = await getBotFeeStats(address)
    return botFees;
  }

  public async generateReport() {
    const [
      balance,
      weeklyUsers,
      totalSupportedMessages
    ] = await Promise.all([
      getAddressBalance(this.holderAddress),
      statsService.getActiveUsers(7),
      statsService.getTotalMessages(1, true)
    ])

    const report = `\nBot fees: *${abbreviateNumber(balance / Math.pow(10, 18))}* ONE` +
      `\nWeekly active users: *${abbreviateNumber(weeklyUsers)}*` +
      `\nDaily user engagement: *${abbreviateNumber(totalSupportedMessages)}*`
    return report;
  }

  public async generateReportEngagementByCommand(days: number) {
    const dbRows = await statsService.getUserEngagementByCommand(days);

    const cropIndex = dbRows.length >= 10 ? 10 : dbRows.length - 1;

    let otherCommandCount = 0;
    for (let i = cropIndex; i < dbRows.length; i++) {
      otherCommandCount += Number(dbRows[i].commandCount);
    }

    const rows = dbRows.slice(0, cropIndex).map((row) => {
      return `${abbreviateNumber(+row.commandCount).padEnd(4)} ${row.command}`
    })

    if (otherCommandCount > 0) {
      rows.push(`${abbreviateNumber(otherCommandCount).padEnd(4)} /other`);
    }

    return "```\n" + rows.join('\n') + "\n```";
  }



  public async generateFullReport() {

    const botFeesReport = (await this.getBotFeeReport(this.holderAddress)) as BotFeesReport;

    const [
      // botFeesReport,
      botFeesWeekly,
      dau,
      totalOne,
      totalCredits,
      weeklyUsers,
      totalMessages,
      totalSupportedMessages,
      engagementByCommand,
    ] = await Promise.all([
      // this.getBotFeeReport(this.holderAddress),
      getBotFee(this.holderAddress, 7),
      statsService.getActiveUsers(0),
      statsService.getTotalONE(),
      statsService.getTotalFreeCredits(),
      statsService.getActiveUsers(7),
      statsService.getTotalMessages(7),
      statsService.getTotalMessages(7, true),
      this.generateReportEngagementByCommand(7),
    ])

    const report =
      `*BOT FEES*` +
      `\nDaily: *${botFeesReport.daily}*` +
      `\nWeekly: *${botFeesReport.weekly}*` +
      `\nMonthly: *${botFeesReport.monthly}*` +

      `\n\nWeekly Bot Fees Collected: *${abbreviateNumber(botFeesWeekly)}*` +
      `\nTotal fees users pay in ONE: *${abbreviateNumber(totalOne)}*` +
      `\nTotal fees users pay in free credits: *${abbreviateNumber(totalCredits)}*` +

      `\n\nDaily Active Users: *${abbreviateNumber(dau)}*` +
      `\nWeekly active users: *${abbreviateNumber(weeklyUsers)}*` +

      `\n\nWeekly user engagement (any commands): *${abbreviateNumber(totalMessages)}*` +
      `\nWeekly user engagement (commands supported by bot): *${abbreviateNumber(totalSupportedMessages)}*` +

      `\n\n${engagementByCommand}`
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

    if (ctx.hasCommand(SupportedCommands.STATS)) {
      const report = await this.generateReport()
      ctx.reply(report, {
        parse_mode: "Markdown",
      });
    }

    if (ctx.hasCommand(SupportedCommands.ALL_STATS)) {
      const report = await this.generateFullReport()
      ctx.reply(report, {
        parse_mode: "Markdown",
      });
    }
  }
}
