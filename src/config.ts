import * as dotenv from 'dotenv'
dotenv.config()

export default {
  port: +(process.env.PORT ?? '3000'),
  appAdmins:
    (process.env.APP_ADMINS?.split(',').map((x) => parseInt(x))) ??
    [],
  telegramBotAuthToken: process.env.TELEGRAM_BOT_AUTH_TOKEN ?? '',
  openAiKey: process.env.OPENAI_API_KEY,
  comfyHost: process.env.COMFY_HOST ?? '',
  comfyWsHost: process.env.COMFY_WS_HOST ?? '',
  comfyHost2: process.env.COMFY_HOST2 ?? '',
  comfyWsHost2: process.env.COMFY_WS_HOST2 ?? '',
  stableDiffusion: {
    stableDiffusionHost: process.env.SD_HOST ?? '',
    imageDefaultMessage:
      'glimpses of a herd of wild elephants crossing a savanna',
    imagesDefaultMessage: 'vintage hot rod with custom flame paint job'
  },
  qrBot: { checkReadable: Boolean(process.env.QRBOT_CHECK_READABLE) ?? false },
  sessionTimeout: process.env.SESSION_TIMEOUT
    ? parseInt(process.env.SESSION_TIMEOUT)
    : 48, // in hours
  llms: {
    apiEndpoint: process.env.LLMS_ENDPOINT ?? '',
    wordLimit: 50,
    model: 'chat-bison',
    minimumBalance: 0,
    isEnabled: Boolean(parseInt(process.env.LLMS_ENABLED ?? '1')),
    prefixes: { ardPrefix: [','] }
  },
  openAi: {
    dalle: {
      isEnabled: Boolean(parseInt(process.env.IMAGE_GEN_ENABLED ?? '1')),
      telegramFileUrl: 'https://api.telegram.org/file/bot',
      completions: {
        temperature:
          (parseInt(process.env.OPENAI_TEMPERATURE ?? '')) ??
          0.8
      },
      defaultPrompt:
        'beautiful waterfall in a lush jungle, with sunlight shining through the trees',
      sessionDefault: {
        numImages: 1,
        imgSize: '1024x1024'
      }
    },
    chatGpt: {
      chatCompletionContext: `You are an AI Bot powered by Harmony. Your strengths are ai api aggregation for chat, 
        image, and voice interactions using OpenAI’s chatgpt, Stable Diffusion, and more. 
        Respond flexibly, but try to stay within 100 words in your response.`,
      webCrawlerContext: 'You will receive a web crawling text. Please get keys concepts, but try to stay within 4000 words in your response.',
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS ?? '800'), // telegram messages has a char limit
      wordLimit: 30,
      wordCountBetween: process.env.WORD_COUNT_BETWEEN
        ? parseInt(process.env.WORD_COUNT_BETWEEN)
        : 100,
      priceAdjustment: process.env.PRICE_ADJUSTMENT
        ? parseInt(process.env.PRICE_ADJUSTMENT)
        : 2,
      isEnabled: Boolean(parseInt(process.env.CHAT_GPT_ENABLED ?? '1')),
      isTypingEnabled: Boolean(
        parseInt(process.env.TYPING_STATUS_ENABLED ?? '1')
      ),
      model: process.env.OPENAI_MODEL ?? 'gpt-4-32k',
      prefixes: {
        chatPrefix: process.env.ASK_PREFIX
          ? process.env.ASK_PREFIX.split(',')
          : ['a.', '.'], // , "?", ">",
        dallePrefix: process.env.DALLE_PREFIX
          ? process.env.DALLE_PREFIX.split(',')
          : ['d.'],
        newPrefix: process.env.NEW_PREFIX
          ? process.env.NEW_PREFIX.split(',')
          : ['n.', '..']
      },
      minimumBalance: process.env.MIN_BALANCE
        ? parseInt(process.env.MIN_BALANCE)
        : 0
    }
  },
  country: {
    hostname: 'https://1.country',
    relayApiUrl: 'https://1ns-registrar-relayer.hiddenstate.xyz',
    tld: '.country',
    contract:
      process.env.DC_CONTRACT ?? '0x547942748Cc8840FEc23daFdD01E6457379B446D',
    defaultRPC: 'https://api.harmony.one',
    restrictedPhrases: process.env.RESTRICTED_PHRASES
      ? process.env.RESTRICTED_PHRASES.split(', ')
      : ['metamask', 'walletconnect'],
    registerPrefix: process.env.COUNTRY_PREFIX
      ? process.env.COUNTRY_PREFIX.split(',')
      : ['+', '%']
  },
  voiceMemo: {
    isEnabled: Boolean(parseInt(process.env.VOICE_MEMO_ENABLED ?? '1')),
    telegramApiId: parseInt(process.env.TELEGRAM_API_ID ?? ''),
    telegramApiHash: process.env.TELEGRAM_API_HASH ?? '',
    speechmaticsApiKey: process.env.SPEECHMATICS_API_KEY ?? '',
    kagiApiKey: process.env.KAGI_API_KEY ?? '',
    servicePublicUrl: process.env.SERVICE_PUBLIC_URL ?? ''
  },
  wallet: {
    webAppUrl:
      process.env.WALLET_WEB_APP_URL ?? 'https://wallet-web-app.netlify.app'
  },
  walletc: {
    webAppUrl:
      process.env.WALLET_CONNECT_WEB_APP_URL ??
      'https://chimerical-unicorn-78e8d9.netlify.app'
  },
  payment: {
    isEnabled: Boolean(parseInt(process.env.PAYMENT_IS_ENABLED ?? '1')),
    secret: process.env.PAYMENT_SECRET ?? '',
    prevSecretKeys: (process.env.PAYMENT_PREVIOUS_SECRET_KEYS ?? '').split(','),
    holderAddress:
      process.env.PAYMENT_HOLDER_ADDRESS ??
      '0x9EE59D58606997AAFd2F6Ba46EC64402829f9b6C',
    whitelist: (process.env.PAYMENT_WHITELIST ?? '')
      .split(',')
      .map((item) => item.toString().toLowerCase())
  },
  schedule: {
    isEnabled: Boolean(parseInt(process.env.SCHEDULE_IS_ENABLED ?? '0')),
    chatId: process.env.SCHEDULE_CHAT_ID ?? '',
    explorerRestApiUrl: process.env.EXPLORER_REST_API_URL ?? '',
    explorerRestApiKey: process.env.EXPLORER_REST_API_KEY ?? '',
    swapSubgraphApiUrl:
      process.env.SWAP_SUBGRAPH_API_URL ??
      'https://api.thegraph.com/subgraphs/name/nick8319/uniswap-v3-harmony'
  },
  walletConnect: { projectId: process.env.WALLET_CONNECT_PROJECT_ID ?? '' },
  db: { url: process.env.DATABASE_URL ?? '' },
  credits: {
    maxChats: 10,
    maxChatsWhitelist: (process.env.CREDITS_CHATS_WHITELIST ?? 'stephentse')
      .split(',')
      .map((item) => item.toString().toLowerCase()),
    creditsAmount: '100'
  },
  betteruptime: { botHeartBitId: process.env.BOT_HEARTBIT_ID ?? '' },
  telegramPayments: { token: process.env.TELEGRAM_PAYMENTS_TOKEN ?? '' }
}
