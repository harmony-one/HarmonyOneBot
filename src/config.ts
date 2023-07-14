import * as dotenv from "dotenv";
dotenv.config();

export default {
  port: +(process.env.PORT || "3000"),
  telegramBotAuthToken: process.env.TELEGRAM_BOT_AUTH_TOKEN || "",
  openAiKey: process.env.OPENAI_API_KEY,
  stableDiffusionHost: process.env.SD_HOST || "",
  qrBot: {
    checkReadable: Boolean(process.env.QRBOT_CHECK_READABLE) || false,
  },
  imageGen: {
    isEnabled: Boolean(parseInt(process.env.IMAGE_GEN_ENABLED || '1')),
    telegramFileUrl: "https://api.telegram.org/file/bot",
    completions: {
      model: process.env.OPENAI_MODEL || "text-davinci-003",
      maxTokens: process.env.OPENAI_MAX_TOKENS && parseInt(process.env.OPENAI_MAX_TOKENS) || 140,
      temperature: process.env.OPENAI_TEMPERATURE && parseInt(process.env.OPENAI_TEMPERATURE) || 0.8,
    },
    sessionDefault: {
      numImages: 1,
      imgSize: "1024x1024",
    },
  },
  country: {
    relayApiUrl: 'https://1ns-registrar-relayer.hiddenstate.xyz',
    tld: '.country'
  },
  voiceMemo: {
    isEnabled: Boolean(parseInt(process.env.VOICE_MEMO_ENABLED || '1')),
    telegramApiId: parseInt(process.env.TELEGRAM_API_ID || ''),
    telegramApiHash: process.env.TELEGRAM_API_HASH || '',
    speechmaticsApiKey: process.env.SPEECHMATICS_API_KEY || '',
    kagiApiKey: process.env.KAGI_API_KEY || '',
    servicePublicUrl: process.env.SERVICE_PUBLIC_URL || '',
  },
  wallet: {
    secret: process.env.TELEGRAM_WALLET_SECRET || "",
    webAppUrl: process.env.WALLET_WEB_APP_URL || "https://wallet-web-app.netlify.app",
  },
  payment: {
    secret: process.env.TELEGRAM_PAYMENT_SECRET || "",
  }
};
