import pino from "pino";
import { Bot } from 'grammy'
import cron from 'node-cron'
import { LRUCache } from 'lru-cache'
import config from '../../config'
import {BotContext, OnMessageContext} from "../types";
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

  private cache = new LRUCache({ max: 100, ttl: 1000 * 60 * 60 * 8 })
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

      let bridgeStatsReport = this.cache.get('bridge_report') || ''
      this.logger.info(`Bridge stats report from cache: "${bridgeStatsReport}"`)
      if(!bridgeStatsReport) {
        const bridgeStats = await getBridgeStats()
        bridgeStatsReport =  `*${bridgeStats.value}* USD (${bridgeStats.change}%)`
        this.cache.set('bridge_report', bridgeStatsReport)
      }

      const networkFeeStats = await getFeeStats()
      const networkFeesReport = `*${networkFeeStats.value}* ONE (${networkFeeStats.change}%)`

      const botFees = await getBotFeeStats(config.payment.holderAddress)
      const botFeesReport = `*${botFees.value}* ONE (${botFees.change}%)`

      const reportMessage = `24-hour report:\n\nNetwork fees: ${networkFeesReport}\nBridged assets: ${bridgeStatsReport}\n@HarmonyOneAIBot fees: ${botFeesReport}`

      this.logger.info(`Prepared message: "${reportMessage}"`)
      this.reportMessage = reportMessage
      return reportMessage
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

  public isSupportedEvent(ctx: OnMessageContext) {
    const { text = '' } = ctx.update.message
    return config.schedule.isEnabled && text?.toLowerCase() === '/botstats'
  }

  public async onEvent(ctx: OnMessageContext) {
    const { message_id, text = ''} = ctx.update.message

    if(text.toLowerCase() === '/botstats') {
      const report = await this.prepareMetricsUpdate()
      if(report) {
        ctx.reply(report, {
          reply_to_message_id: message_id,
          parse_mode: "Markdown",
        });
      }
    }
  }
}
