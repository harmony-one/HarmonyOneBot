import * as dotenv from "dotenv";
dotenv.config();

export default {
  port: +(process.env.PORT || "3000"),
  telegramBotAuthToken: process.env.TELEGRAM_BOT_AUTH_TOKEN || "",
  openAiKey: process.env.OPENAI_API_KEY,
  stableDiffusionHost: process.env.SD_HOST || "",
  qr: {
    checkReadable: false,
  },
  imageGen: {
    telegramFileUrl:
      process.env.TELEGRAM_FILE_URL || "https://api.telegram.org/file/bot",
    completions: {
      model: process.env.OPENAI_MODEL || "text-davinci-003",
      maxTokens: process.env.OPENAI_MAX_TOKENS || 140,
      temperature: process.env.OPENAI_TEMPERATURE || 0.8,
    },
    sessionDefault: {
      numImages: 1,
      imgSize: "1024x1024",
    },
  }
};
