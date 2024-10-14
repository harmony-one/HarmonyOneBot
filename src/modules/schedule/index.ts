import pino from 'pino'
import { type Bot } from 'grammy'
import cron from 'node-cron'
import config from '../../config'
import { type BotContext, type OnMessageContext } from '../types'
import { getActiveAccounts, getFees } from './explorerApi'
import { getAddressBalance, getBotFee, getBotFeeStats } from './harmonyApi'
import { getAvgStakes, getTVL } from './bridgeAPI'
import { statsService } from '../../database/services'
import { abbreviateNumber, lessThan100, precise } from './utils'
import { getOneRate } from './exchangeApi'
import { getTradingVolume } from './subgraphAPI'
import { isValidDate, parseDate } from '../llms/utils/helpers'

enum SupportedCommands {
  BOT_STATS = 'botstats',
  STATS = 'stats',
  ALL_STATS = 'allstats'
}

export class BotSchedule {
  private readonly holderAddress = config.payment.holderAddress
  private readonly bot: Bot<BotContext>
  private readonly logger = pino({
    name: 'Schedule',
    transport: {
      target: 'pino-pretty',
      options: { colorize: true }
    }
  })

  constructor (bot: Bot<BotContext>) {
    this.bot = bot

    if (config.schedule.isEnabled) {
      if (config.schedule.chatId) {
        this.runCronJob().catch((ex) => {
          this.logger.error(`Error runCronJob ${ex}`)
        })
      } else {
        this.logger.info('No chatId defined. Set [SCHEDULE_CHAT_ID] variable.')
      }
    } else {
      this.logger.info('Scheduled metrics is disabled. Set [SCHEDULE_IS_ENABLED=1] to enable.')
    }
  }

  private async postMetricsUpdate (): Promise<void> {
    const scheduleChatId = config.schedule.chatId
    if (!scheduleChatId) {
      this.logger.error('Post updates: no chatId defined. Set [SCHEDULE_CHAT_ID] variable.')
      return
    }

    const reportMessage = await this.generateReport()
    if (reportMessage) {
      await this.bot.api.sendMessage(scheduleChatId, reportMessage, { parse_mode: 'Markdown' })
      this.logger.info(`Daily metrics posted in chat ${scheduleChatId}: ${reportMessage}`)
    } else {
      this.logger.error('Cannot prepare daily /stats message')
    }
  }

  private async runCronJob (): Promise<cron.ScheduledTask> {
    return cron.schedule('00 16 * * *', () => {
      this.logger.info('Posting daily metrics...')
      this.postMetricsUpdate().catch((error) => {
        this.logger.error(`postMetricsUpdate error ${error}`)
      })
    }, {
      scheduled: true,
      timezone: 'Europe/Lisbon'
    })
  }

  public isSupportedEvent (ctx: OnMessageContext): boolean {
    return ctx.hasCommand(Object.values(SupportedCommands))
  }

  public async getBotFeeReport (address: string): Promise<string> {
    const botFees = await getBotFeeStats(this.holderAddress)
    return `*${botFees.value}* ONE (${botFees.change}%)`
  }

  public async generateReport (): Promise<string> {
    const [
      networkFeesWeekly,
      walletsCountWeekly,
      oneRate,

      bridgeTVL,
      totalStakes,
      swapTradingVolume,

      balance,
      uniqueUsersCount,
      totalMessage,

      weeklyUsers,
      newUsers,
      weeklyRevenue
    ] = await Promise.all([
      getFees(7),
      getActiveAccounts(7),
      getOneRate(),

      getTVL(),
      getAvgStakes(),
      getTradingVolume(7),

      getAddressBalance(this.holderAddress),
      statsService.getUniqueUsersCount(),
      statsService.getTotalMessages(0, true),

      statsService.getActiveUsers(7),
      statsService.getNewUsers(7),
      getBotFee(this.holderAddress, 7) // statsService.getRevenue(100)
    ])

    const networkFeesSum = networkFeesWeekly.reduce((sum, item) => sum + +item.value, 0)
    const walletsCountSum = walletsCountWeekly.reduce((sum, item) => sum + +item.value, 0)
    const walletsCountAvg = walletsCountWeekly.length > 0
      ? Math.round(walletsCountSum / walletsCountWeekly.length)
      : 0

    const networkUsage =
      'Network weekly fees, wallets, price: ' +
      `*${abbreviateNumber(networkFeesSum)}* ONE, ${abbreviateNumber(walletsCountAvg)}, $${precise(oneRate)}`

    const swapTradingVolumeSum = swapTradingVolume.reduce((sum, item) => sum + Math.round(+item.volumeUSD), 0)
    const totalStakeONE = totalStakes

    const assetsUpdate =
      'Total assets, monthly stakes, weekly swaps: ' +
      `*$${abbreviateNumber(bridgeTVL)}*, ${abbreviateNumber(totalStakeONE)}, $${abbreviateNumber(swapTradingVolumeSum)}`

    const oneBotWeeklyMetrics =
      'Bot weekly earns, active users, new users: ' +
      `*${abbreviateNumber(+weeklyRevenue)}* ONE` +
      `, ${lessThan100(abbreviateNumber(weeklyUsers))}` +
      `, ${lessThan100(abbreviateNumber(newUsers.periodUsers))}`

    const oneBotMetrics =
      'Bot total earns, users, messages: ' +
      `*${abbreviateNumber(balance / Math.pow(10, 18))}* ONE` +
      `, ${lessThan100(abbreviateNumber(uniqueUsersCount))}` +
      `, ${lessThan100(abbreviateNumber(totalMessage))}`

    return `${networkUsage}\n${assetsUpdate}\n${oneBotWeeklyMetrics}\n${oneBotMetrics}`
  }

  public async generateReportEngagementByCommand (days: number): Promise<string> {
    const dbRows = await statsService.getUserEngagementByCommand(days)
    const cropIndex = dbRows.length >= 50 ? 50 : dbRows.length - 1
    if (dbRows.length === 0) {
      return ''
    }
    let otherCommandCount = 0
    for (let i = cropIndex; i < dbRows.length; i++) {
      otherCommandCount += Number(dbRows[i].commandCount)
    }

    const rows = dbRows.slice(0, cropIndex).map((row) => {
      return `${abbreviateNumber(+row.commandCount).padEnd(4)} ${row.command}`
    })

    if (otherCommandCount > 0) {
      rows.push(`${abbreviateNumber(otherCommandCount).padEnd(4)} /other`)
    }

    return '```\n' + rows.join('\n') + '\n```'
  }

  public async generateFullReport (date?: Date): Promise<string> {
    let reportLabel = ''

    if (date && !isValidDate(date)) {
      return 'Invalid date format. Please use MM/DD/YYYY'
    }
    const [
      botFeesReport,
      botFeesWeekly,
      dau,
      weeklyUsers,
      totalMessages,
      totalSupportedMessages,
      engagementByCommand,
      onetimeUsers,
      newUsers,
      totalUsers,
      totalPaidUsers,
      totalfreePaidUsers,
      totalOne
    ] = await Promise.all([
      this.getBotFeeReport(this.holderAddress),
      getBotFee(this.holderAddress, 7),
      statsService.getActiveUsers(0),
      statsService.getActiveUsers(7),
      statsService.getTotalMessages(7),
      statsService.getTotalMessages(7, true),
      this.generateReportEngagementByCommand(7),
      statsService.getOnetimeUsers(date),
      statsService.getNewUsers(7, date),
      statsService.getUniqueUsersCount(date),
      statsService.getPaidUsers(date),
      statsService.getFreeCreditUsers(date),
      statsService.getTotalONE(date)
    ])

    if (date) {
      const dateParsed = parseDate(date)
      reportLabel = `*${dateParsed?.monthName} - ${dateParsed?.year} stats*`
    } else {
      reportLabel = '*All-time stats*'
    }

    const report = `\nBot fees: *${botFeesReport}*` +
      `\nWeekly bot fees collected: *${abbreviateNumber(botFeesWeekly)}*` +
      `\nDaily Active Users: *${abbreviateNumber(dau)}*` +
      `\nWeekly active users: *${abbreviateNumber(weeklyUsers)}*` +
      `\nWeekly new users: *${abbreviateNumber(newUsers.periodUsers)}*` +
      `\nWeekly user engagement (any commands): *${abbreviateNumber(totalMessages)}*` +
      `\nWeekly user engagement (commands supported by bot): *${abbreviateNumber(totalSupportedMessages)}*` +
      `\n\n${reportLabel}` +
      `\nTotal users: *${totalUsers}*` +
      `\nOne-time users: *${onetimeUsers}*` +
      `${date ? '\nTotal new users: *' + newUsers.monthUsers + '*' : ''}` +
      `\nTotal fees users pay in ONE: *${abbreviateNumber(totalOne)}*` +
      `\nTotal fees users pay in credits: *${abbreviateNumber(totalPaidUsers.amountCredits + totalPaidUsers.amountOnes)}*` +
      `\nTotal fees users pay in free credits: *${abbreviateNumber(totalfreePaidUsers.amountFreeCredits + (totalPaidUsers.freeCreditsBurned))}*` +
      `\nTotal free credits reamining: *${abbreviateNumber(totalfreePaidUsers.amountFreeCreditsRemaining)}*` +
      `\nTotal users who paid in ONE: *${totalPaidUsers.users}*` +
      `\nTotal users who paid in free credits: *${totalfreePaidUsers.users}*` +
      `\n\n${engagementByCommand}`
    return report
  }

  public async onEvent (ctx: OnMessageContext): Promise<void> {
    if (ctx.hasCommand(SupportedCommands.BOT_STATS)) {
      const report = await this.generateReport()
      if (report) {
        await ctx.reply(report, {
          parse_mode: 'Markdown',
          message_thread_id: ctx.message?.message_thread_id
        })
      }
    }

    if (ctx.hasCommand(SupportedCommands.STATS)) {
      const report = await this.generateReport()
      await ctx.reply(report, {
        parse_mode: 'Markdown',
        message_thread_id: ctx.message?.message_thread_id
      })
    }

    if (ctx.hasCommand(SupportedCommands.ALL_STATS)) {
      let date
      const input = ctx.match
      if (input) {
        date = new Date(input)
      }
      const report = await this.generateFullReport(date)
      await ctx.reply(report, {
        parse_mode: 'Markdown',
        message_thread_id: ctx.message?.message_thread_id
      })
    }
  }
}
