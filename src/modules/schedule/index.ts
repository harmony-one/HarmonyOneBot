import pino from "pino";
import { Bot } from 'grammy'
import cron from 'node-cron'
import config from '../../config'
import {BotContext, OnMessageContext} from "../types";
import {getDailyMetrics, MetricsDailyType} from "./explorerApi";
import {getAddressBalance, getBotFee, getBotFeeStats} from "./harmonyApi";
import {getTotalStakes, getTVL} from "./bridgeAPI";
import {statsService} from "../../database/services";
import {abbreviateNumber, lessThan100, precise} from "./utils";
import {getOneRate} from "./exchangeApi";
import {getTradingVolume} from "./subgraphAPI";

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

  private async postMetricsUpdate() {
    const scheduleChatId = config.schedule.chatId
    if(!scheduleChatId) {
      this.logger.error(`Post updates: no chatId defined. Set [SCHEDULE_CHAT_ID] variable.`)
      return
    }

    const reportMessage = await this.generateReport()
    if(reportMessage) {
      await this.bot.api.sendMessage(scheduleChatId, reportMessage, {
        parse_mode: "Markdown",
      })
      this.logger.info(`Daily metrics posted in chat ${scheduleChatId}: ${reportMessage}`)
    } else {
      this.logger.error(`Cannot prepare daily /stats message`)
    }
  }

  private async runCronJob() {
    cron.schedule('00 16 * * *', () => {
      this.logger.info('Posting daily metrics...')
      this.postMetricsUpdate()
    }, {
      scheduled: true,
      timezone: "Europe/Lisbon"
    });
  }

  public isSupportedEvent(ctx: OnMessageContext) {
    return config.schedule.isEnabled && ctx.hasCommand(Object.values(SupportedCommands));
  }

  public async getBotFeeReport(address: string): Promise<string> {
    const botFees = await getBotFeeStats(this.holderAddress)
    return `*${botFees.value}* ONE (${botFees.change}%)`
  }

  public async generateReport() {
    const [
      networkFeesWeekly,
      walletsCountWeekly,
      oneRate,

      bridgeTVL,
      totalStakes,
      swapTradingVolume,

      balance,
      weeklyUsers,
      dailyMessages
    ] = await Promise.all([
      getDailyMetrics(MetricsDailyType.totalFee, 7),
      getDailyMetrics(MetricsDailyType.walletsCount, 7),
      getOneRate(),

      getTVL(),
      getTotalStakes(),
      getTradingVolume(),

      getAddressBalance(this.holderAddress),
      statsService.getActiveUsers(7),
      statsService.getTotalMessages(1, true)
    ])

    const networkFeesSum = networkFeesWeekly.reduce((sum, item) => sum + +item.value, 0)
    const walletsCountSum = walletsCountWeekly.reduce((sum, item) => sum + +item.value, 0)
    const walletsCountAvg = Math.round(walletsCountSum / walletsCountWeekly.length)

    const networkUsage =
      `Network weekly fees, wallets, price: ` +
      `*${abbreviateNumber(networkFeesSum)}* ONE, ${abbreviateNumber(walletsCountAvg)}, $${precise(oneRate)}`

    const swapTradingVolumeSum = swapTradingVolume.reduce((sum, item) => sum + Math.round(+item.volumeUSD), 0)
    const totalStakeUSD = Math.round(oneRate * totalStakes)

    const assetsUpdate =
      `Current assets, total stakes, monthly swaps: ` +
      `*$${abbreviateNumber(bridgeTVL)}*, $${abbreviateNumber(totalStakeUSD)}, $${abbreviateNumber(swapTradingVolumeSum)}`

    const oneBotMetrics =
      `Bot total earns, weekly users, daily messages: ` +
      `*${abbreviateNumber(balance / Math.pow(10, 18))}* ONE` +
      `, ${lessThan100(abbreviateNumber(weeklyUsers))}` +
      `, ${lessThan100(abbreviateNumber(dailyMessages))}`

    return `${networkUsage}\n${assetsUpdate}\n${oneBotMetrics}`;
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
    const [
      botFeesReport,
      botFeesWeekly,
      dau,
      totalOne,
      totalCredits,
      weeklyUsers,
      totalMessages,
      totalSupportedMessages,
      engagementByCommand,
    ] = await Promise.all([
      this.getBotFeeReport(this.holderAddress),
      getBotFee(this.holderAddress, 7),
      statsService.getActiveUsers(0),
      statsService.getTotalONE(),
      statsService.getTotalFreeCredits(),
      statsService.getActiveUsers(7),
      statsService.getTotalMessages(7),
      statsService.getTotalMessages(7, true),
      this.generateReportEngagementByCommand(7),
    ])

    const report = `\nBot fees: *${botFeesReport}*` +
      `\nWeekly bot fees collected: *${abbreviateNumber(botFeesWeekly)}*` +
      `\nDaily Active Users: *${abbreviateNumber(dau)}*` +
      `\nTotal fees users pay in ONE: *${abbreviateNumber(totalOne)}*` +
      `\nTotal fees users pay in free credits: *${abbreviateNumber(totalCredits)}*` +
      `\nWeekly active users: *${abbreviateNumber(weeklyUsers)}*` +
      `\nWeekly user engagement (any commands): *${abbreviateNumber(totalMessages)}*` +
      `\nWeekly user engagement (commands supported by bot): *${abbreviateNumber(totalSupportedMessages)}*` +
      `\n\n${engagementByCommand}`
    return report;
  }

  public async onEvent(ctx: OnMessageContext) {
    const { message_id } = ctx.update.message

    if(ctx.hasCommand(SupportedCommands.BOT_STATS)) {
      const report = await this.generateReport()
      if(report) {
        await ctx.reply(report, {
          parse_mode: "Markdown",
          message_thread_id: ctx.message?.message_thread_id,
        });
      }
    }

    if (ctx.hasCommand(SupportedCommands.STATS)) {
      const report = await this.generateReport()
      ctx.reply(report, {
        parse_mode: "Markdown",
        message_thread_id: ctx.message?.message_thread_id,
      });
    }

    if (ctx.hasCommand(SupportedCommands.ALL_STATS)) {
      const report = await this.generateFullReport()
      ctx.reply(report, {
        parse_mode: "Markdown",
        message_thread_id: ctx.message?.message_thread_id,
      });
    }
  }
}
