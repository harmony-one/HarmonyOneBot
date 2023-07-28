import pino from "pino";
import { Bot } from 'grammy'
import cron from 'node-cron'
import config from '../../config'
import {BotContext} from "../types";
import {getFeeStats} from "./explorerApi";
import {getBotFeeStats} from "./harmonyApi";
import {getBridgeStats} from "./bridgeAPI";

export class BotSchedule {
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

  private reportMessage = ''

  constructor(bot: Bot<BotContext>) {
    this.bot = bot

    if(config.schedule.isEnabled) {
      if(config.schedule.chatId) {
        this.runCronJob()
      } else {
        this.logger.error(`No chatId defined. Set [SCHEDULE_CHAT_ID] variable.`)
      }
    } else {
      this.logger.error(`Scheduled metrics is disabled. Set [SCHEDULE_IS_ENABLED=1].`)
    }

  }

  private async prepareMetricsUpdate() {
    try {
      this.logger.info(`Start collecting stats...`)

      const bridgeStats = await getBridgeStats()
      const bridgeStatsReport =  `*${bridgeStats.value}* USD (${bridgeStats.change}%)`

      const networkFeeStats = await getFeeStats()
      const networkFeesReport = `*${networkFeeStats.value}* ONE (${networkFeeStats.change}%)`

      const botFees = await getBotFeeStats(config.payment.holderAddress)
      const botFeesReport = `*${botFees.value}* ONE (${botFees.change}%)`

      const reportMessage = `24-hour report:\n\nNetwork fees: ${networkFeesReport}\nBridged assets: ${bridgeStatsReport}\n@HarmonyOneAIBot fees: ${botFeesReport}`

      this.logger.info(`Prepared message: "${reportMessage}"`)
      this.reportMessage = reportMessage
    } catch (e) {
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
    cron.schedule('30 01 * * *', () => {
      this.prepareMetricsUpdate()
    }, {
      scheduled: true,
      timezone: "Europe/Lisbon"
    });

    cron.schedule('00 02 * * *', () => {
      this.logger.info('Posting daily metrics')
      this.postMetricsUpdate()
    }, {
      scheduled: true,
      timezone: "Europe/Lisbon"
    });

    // await this.prepareMetricsUpdate()
    // await this.postMetricsUpdate()
  }
}
