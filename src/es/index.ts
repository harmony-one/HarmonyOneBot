import { Client } from '@elastic/elasticsearch'
import config from '../config'
import { type WriteResponseBase } from '@elastic/elasticsearch/lib/api/types'
import { pino } from 'pino'
let client: Client | null = null

const logger = pino({
  name: 'es',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
})

export enum ESIndex {
  BotLogs = 'bot-logs'
}

export interface BotLogData {
  command: string
  module: string
  text?: string
  userId: number
  username?: string
  totalProcessingTime: number
  firstResponseTime: number
  actualResponseTime: number
  refunded: boolean
  sessionState: string
}

export const ES = {
  init: (): Client | null => {
    if (!config.es.url) {
      logger.info('Skipped initializing ES')
      return null
    }
    client = new Client({
      node: config.es.url,
      auth: { username: config.es.username, password: config.es.password },
      tls: { rejectUnauthorized: false }
    })
    return client
  },
  add: async ({ index = ESIndex.BotLogs, ...props }: BotLogData & { index?: ESIndex }): Promise<undefined | WriteResponseBase> => {
    if (!client) {
      return
    }
    return await client.index({
      index,
      document: {
        time: Date.now(),
        ...props
      }
    })
  },
  client: (): Client | null => client
}
