import * as dotenv from "dotenv";
dotenv.config();

export default {
  port: +(process.env.PORT || "3000"),
  telegramBotAuthToken: process.env.TELEGRAM_BOT_AUTH_TOKEN || "",
  openAiKey: process.env.OPENAI_API_KEY,
  stableDiffusionHost: process.env.SD_HOST || "",
  qrBot: {
    checkReadable: false,
    sdConfig: {
      // It will be added to the user's prompt
      additionalPrompt: '(masterpiece), (best quality), (ultra-detailed), hires',
      defaultNegativePrompt: '(KHFB, AuroraNegative),(Worst Quality, Low Quality:1.4), ugly, tiling, poorly drawn hands, poorly drawn feet, poorly drawn face, out of frame, extra limbs, disfigured, deformed, body out of frame, bad anatomy, watermark, signature, cut off, low contrast, underexposed, overexposed, bad art, beginner, amateur, distorted face, blurry, draft, grainy',
      img2img: {
        steps: 60,
        guidanceStart: 0.17,
        guidanceEnd: 0.7,
        width: 610,
        height: 610,
      },
      text2img: {
        steps: 40,
        guidanceStart: 0.02,
        guidanceEnd: 0.9,
        width: 610,
        height: 610,
      }
    }
  },
  imageGen: {
    telegramFileUrl: "https://api.telegram.org/file/bot",
    completions: {
      model: process.env.OPENAI_MODEL || "text-davinci-003",
      maxTokens: process.env.OPENAI_MAX_TOKENS || 140,
      temperature: process.env.OPENAI_TEMPERATURE || 0.8,
    },
    sessionDefault: {
      numImages: 1,
      imgSize: "1024x1024",
    },
  },
  country: {
    relayApiUrl: 'https://1ns-registrar-relayer.hiddenstate.xyz',
    tld: '.country'
  }
};
