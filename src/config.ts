import * as dotenv from 'dotenv'
dotenv.config()

export default {
  port: +(process.env.PORT || '3000'),
  telegramBotAuthToken: process.env.TELEGRAM_BOT_AUTH_TOKEN || '',
}
