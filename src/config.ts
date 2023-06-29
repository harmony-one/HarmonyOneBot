import * as dotenv from 'dotenv'
dotenv.config()

export default {
  port: +(process.env.PORT || '3000'),
  telegramBotAuthToken: process.env.TELEGRAM_BOT_AUTH_TOKEN || '',
  openAiKey: process.env.OPENAI_API_KEY,
  imageGen: {
    telegramFileUrl: 'https://api.telegram.org/file/bot',
    completions: {
      model: 'text-davinci-003',
      maxTokens: 140,
      temperature: 0.8
    },
    sessionDefault: {
      numImages: 1,
      lastImages: [],
      imgSize: '1024x1024'
    },
  }
}
