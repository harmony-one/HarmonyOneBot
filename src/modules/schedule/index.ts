import pino from "pino";
import { Bot } from 'grammy'
import axios from 'axios'
import cron from 'node-cron'
import config from '../../config'
import {BotContext} from "../types";

export enum MetricsDailyType {
  walletsCount = 'wallets_count',
  transactionsCount = 'transactions_count',
  averageFee = 'average_fee',
  blockSize = 'block_size',
  totalFee = 'total_fee',
}

interface MetricsDaily {
  date: string
  value: string
}

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

  private async getExplorerMetrics(type: MetricsDailyType, limit = 7) {
    const { explorerRestApiUrl: apiUrl, explorerRestApiKey: apiKey } = config.schedule

    const requestUrl = `${apiUrl}/v0/metrics?type=${type}&limit=${limit}`
    this.logger.info('requestUrl '+requestUrl)
    const { data } = await axios.get<MetricsDaily[]>(requestUrl)
    return data
  }

  private async postMetricsUpdate() {
    const { chatId } = config.schedule

    try {
      const totalFeeMetrics = await this.getExplorerMetrics(MetricsDailyType.totalFee)
      console.log('totalFeeMetrics', totalFeeMetrics)
    } catch (e) {
      this.logger.error(`Cannot get metrics data: ${(e as Error).message}`)
    }
    // await this.bot.api.sendMessage(chatId, '', {
    //   parse_mode: "Markdown",
    // })
  }

  public runCronJob() {
    cron.schedule('33 20 * * *', () => {
      this.logger.info('Start collecting daily metrics...')
      this.postMetricsUpdate()
    }, {
      scheduled: true,
      timezone: "Europe/Lisbon"
    });
    this.postMetricsUpdate()
  }
}
