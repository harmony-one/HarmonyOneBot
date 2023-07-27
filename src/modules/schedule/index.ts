import pino from "pino";
import { Bot } from 'grammy'
import cron from 'node-cron'
import config from '../../config'
import {BotContext} from "../types";
import {getFeeStats} from "./explorerApi";
import {getBotFeeStats} from "./harmonyApi";

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

  constructor(bot: Bot<BotContext>) {
    this.bot = bot
    this.runCronJob()
  }

  private async postMetricsUpdate() {
    const scheduleChatId = config.schedule.chatId
    if(!scheduleChatId) {
      this.logger.error(`No schedule chatId defined. Set [SCHEDULE_CHAT_ID] variable.`)
      return
    }
    try {
      const networkFeeStats = await getFeeStats()
      const networkFeesReport = `*${networkFeeStats.value}* ONE (${networkFeeStats.change}%)`
      const botFees = await getBotFeeStats(config.payment.holderAddress)
      const botFeesReport = `*${botFees.value}* ONE (${botFees.change}%)`

      const reportText = `24-hour network fees: ${networkFeesReport}\n24-hour @HarmonyOneAIBot fees: ${botFeesReport}`

      await this.bot.api.sendMessage(scheduleChatId, reportText, {
        parse_mode: "Markdown",
      })
    } catch (e) {
      this.logger.error(`Cannot get metrics data: ${(e as Error).message}`)
    }
  }

  public runCronJob() {
    cron.schedule('00 02 * * *', () => {
      this.logger.info('Start collecting daily metrics...')
      this.postMetricsUpdate()
    }, {
      scheduled: true,
      timezone: "Europe/Lisbon"
    });
    // this.postMetricsUpdate()
  }
}
