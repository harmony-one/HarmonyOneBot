import * as dotenv from 'dotenv'
dotenv.config()

export default {
  port: +(process.env.PORT || '3000'),
  telegramBotAuthToken: process.env.TELEGRAM_BOT_AUTH_TOKEN || '',
  stableDiffusionHost: process.env.SD_HOST || '',
  qr: {
    checkReadable: false,
  }
}
