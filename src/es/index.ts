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

export interface BotLogData {
  command: string
  module: string
  text?: string
  userId: number // long integer
  username?: string
  totalProcessingTime: string // converted from bigint
  firstResponseTime: string // converted from bigint
  actualResponseTime: string // converted from bigint
  refunded: boolean
  sessionState: string
  totalCredits: string // converted from bigint
  freeCredits: string // converted from bigint
  oneCredits: string // converted from bigint
  fiatCredits: string // converted from bigint
}

const Index = config.es.index ?? 'bot-logs'

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
  add: async ({ index = Index, ...props }: BotLogData & { index?: string }): Promise<undefined | WriteResponseBase> => {
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
