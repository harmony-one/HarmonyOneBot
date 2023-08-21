import * as dotenv from "dotenv";
dotenv.config();

export default {
  port: +(process.env.PORT || "3000"),
  appAdmins:
    (process.env.APP_ADMINS &&
      process.env.APP_ADMINS.split(",").map((x) => parseInt(x))) ||
    [],
  telegramBotAuthToken: process.env.TELEGRAM_BOT_AUTH_TOKEN || "",
  openAiKey: process.env.OPENAI_API_KEY,
  comfyHost: process.env.COMFY_HOST || "",
  comfyWsHost: process.env.COMFY_WS_HOST || "",
  comfyHost2: process.env.COMFY_HOST2 || "",
  comfyWsHost2: process.env.COMFY_WS_HOST2 || "",
  stableDiffusion: {
    stableDiffusionHost: process.env.SD_HOST || "",
    imageDefaultMessage:
      "glimpses of a herd of wild elephants crossing a savanna",
    imagesDefaultMessage: "vintage hot rod with custom flame paint job",
  },
  qrBot: {
    checkReadable: Boolean(process.env.QRBOT_CHECK_READABLE) || false,
  },
  sessionTimeout: process.env.SESSION_TIMEOUT
    ? parseInt(process.env.SESSION_TIMEOUT)
    : 48, // in hours
  openAi: {
    maxTokens:
      (process.env.OPENAI_MAX_TOKENS &&
        parseInt(process.env.OPENAI_MAX_TOKENS)) ||
      800, // telegram messages has a char limit
    dalle: {
      isEnabled: Boolean(parseInt(process.env.IMAGE_GEN_ENABLED || "1")),
      telegramFileUrl: "https://api.telegram.org/file/bot",
      completions: {
        model: process.env.OPENAI_MODEL || "text-davinci-003",
        temperature:
          (process.env.OPENAI_TEMPERATURE &&
            parseInt(process.env.OPENAI_TEMPERATURE)) ||
          0.8,
      },
      defaultPrompt:
        "beautiful waterfall in a lush jungle, with sunlight shining through the trees",
      sessionDefault: {
        numImages: 1,
        imgSize: "1024x1024",
      },
    },
    chatGpt: {
      priceAdjustment: process.env.PRICE_ADJUSTMENT
        ? parseInt(process.env.PRICE_ADJUSTMENT)
        : 2,
      isEnabled: Boolean(parseInt(process.env.CHAT_GPT_ENABLED || "1")),
      //hard coded gpt-4
      model: "gpt-4", // process.env.OPENAI_MODEL ||
      chatPrefix: process.env.GROUP_PREFIX
        ? process.env.GROUP_PREFIX.split(",")
        : ["?", ">"],
      minimumBalance: process.env.MIN_BALANCE
        ? parseInt(process.env.MIN_BALANCE)
        : 0,
    },
  },
  country: {
    hostname: "https://1.country",
    relayApiUrl: "https://1ns-registrar-relayer.hiddenstate.xyz",
    tld: ".country",
    contract:
      process.env.DC_CONTRACT || "0x547942748Cc8840FEc23daFdD01E6457379B446D",
    defaultRPC: "https://api.harmony.one",
    restrictedPhrases: process.env.RESTRICTED_PHRASES
      ? process.env.RESTRICTED_PHRASES.split(", ")
      : ["metamask", "walletconnect"],
    registerPrefix: process.env.COUNTRY_PREFIX
      ? process.env.COUNTRY_PREFIX.split(",")
      : ["+", "%"],
  },
  voiceMemo: {
    isEnabled: Boolean(parseInt(process.env.VOICE_MEMO_ENABLED || "1")),
    telegramApiId: parseInt(process.env.TELEGRAM_API_ID || ""),
    telegramApiHash: process.env.TELEGRAM_API_HASH || "",
    speechmaticsApiKey: process.env.SPEECHMATICS_API_KEY || "",
    kagiApiKey: process.env.KAGI_API_KEY || "",
    servicePublicUrl: process.env.SERVICE_PUBLIC_URL || "",
  },
  wallet: {
    webAppUrl:
      process.env.WALLET_WEB_APP_URL || "https://wallet-web-app.netlify.app",
  },
  walletc: {
    webAppUrl:
      process.env.WALLET_CONNECT_WEB_APP_URL ||
      "https://chimerical-unicorn-78e8d9.netlify.app",
  },
  payment: {
    isEnabled: Boolean(parseInt(process.env.PAYMENT_IS_ENABLED || "1")),
    secret: process.env.PAYMENT_SECRET || "",
    prevSecretKeys: (process.env.PAYMENT_PREVIOUS_SECRET_KEYS || "").split(","),
    holderAddress:
      process.env.PAYMENT_HOLDER_ADDRESS ||
      "0x9EE59D58606997AAFd2F6Ba46EC64402829f9b6C",
    whitelist: (process.env.PAYMENT_WHITELIST || "")
      .split(",")
      .map((item) => item.toString().toLowerCase()),
  },
  schedule: {
    isEnabled: Boolean(parseInt(process.env.SCHEDULE_IS_ENABLED || "0")),
    chatId: process.env.SCHEDULE_CHAT_ID || "",
    explorerRestApiUrl: process.env.EXPLORER_REST_API_URL || "",
    explorerRestApiKey: process.env.EXPLORER_REST_API_KEY || "",
    swapSubgraphApiUrl:
      process.env.SWAP_SUBGRAPH_API_URL ||
      "https://api.thegraph.com/subgraphs/name/nick8319/uniswap-v3-harmony",
  },
  walletConnect: {
    projectId: process.env.WALLET_CONNECT_PROJECT_ID || "",
  },
  db: {
    url: process.env.DATABASE_URL || "",
  },
  credits: {
    maxChats: 10,
    maxChatsWhitelist: (process.env.CREDITS_CHATS_WHITELIST || "stephentse")
      .split(",")
      .map((item) => item.toString().toLowerCase()),
    creditsAmount: "100",
  },
};
