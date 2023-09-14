import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions'
import { pino } from 'pino'

import config from './config'

const logger = pino({
  name: 'bot',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
})

const {
  telegramBotAuthToken,
  voiceMemo: { telegramApiId, telegramApiHash }
} = config

const stringSession = new StringSession()

export const initTelegramClient = async () => {
  const client = new TelegramClient(
    stringSession,
    telegramApiId,
    telegramApiHash,
    { connectionRetries: 5 }
  )
  await client.start({
    botAuthToken: telegramBotAuthToken,
    onError: (err) => { logger.error(err) }
  })
  logger.info('Telegram session:', client.session.save())
  return client
}
