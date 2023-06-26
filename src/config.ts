import * as dotenv from 'dotenv'
dotenv.config()

export default {
  telegramBotAuthToken: process.env.TELEGRAM_BOT_AUTH_TOKEN || '',
  telegramApiId: parseInt(process.env.TELEGRAM_API_ID || '0'),
  telegramApiHash: process.env.TELEGRAM_API_HASH || '',
}
