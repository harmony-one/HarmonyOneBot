import * as dotenv from 'dotenv'
import { execSync } from 'child_process'
dotenv.config()

let commitHash = ''
try {
  commitHash = execSync('git rev-parse HEAD').toString().trim()
  console.log('### commitHash', commitHash)
} catch (error) {
  console.error('Error retrieving commit hash:', error)
}

export default {
  botName: process.env.BOT_NAME ?? 'local',
  commitHash,
  port: +(process.env.PORT ?? '3000'),
  appAdmins:
    (process.env.APP_ADMINS?.split(',').map((x) => parseInt(x))) ??
    [],
  telegramBotAuthToken: process.env.TELEGRAM_BOT_AUTH_TOKEN ?? '',
  openAiKey: process.env.OPENAI_API_KEY,
  sdBalancer: process.env.SD_BALANCER ?? '',
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
    apiEndpoint: 'http://127.0.0.1:5000', // // process.env.LLMS_ENDPOINT, // 'http://127.0.0.1:5000',
    apiKey: process.env.LLMS_API_KEY ?? '',
    wordLimit: 50,
    model: 'chat-bison',
    minimumBalance: 0,
    isEnabled: Boolean(parseInt(process.env.LLMS_ENABLED ?? '1')),
    pdfUrl: process.env.PDF_URL ?? '',
    processingTime: 300000
  },
  openAi: {
    dalle: {
      isEnabled: Boolean(parseInt(process.env.IMAGE_GEN_ENABLED ?? '1')),
      isInscriptionLotteryEnabled: false,
      telegramFileUrl: 'https://api.telegram.org/file/bot',
      completions: {
        temperature:
          (parseInt(process.env.OPENAI_TEMPERATURE ?? '')) ??
          0.8
      },
      defaultPrompt:
        'beautiful waterfall in a lush jungle, with sunlight shining through the trees',
      sessionDefault: {
        model: 'dall-e-3',
        quality: 'hd',
        numImages: 1,
        imgSize: '1024x1024'
      }
    },
    chatGpt: {
      chatCompletionContext:
        'You are an AI Bot powered by Harmony. Your strengths are ai api aggregation for chat, image, and voice interactions. Leveraging a suite of sophisticated subagents, you have the capability to perform tasks such as internet browsing and accessing various services. Your responses should be adaptable to the conversation while maintaining brevity, ideally not exceeding 100 words.',
      // 'You are an AI Bot powered  dby Harmony. Your strengths are ai api aggregation for chat, image, and voice interactions, and more. You have subagents that helps you with task like browsing the internet, and other services. Respond flexibly, but try to stay within 100 words in all of your responses.',
      webCrawlerContext: 'You will receive a web crawling text. Please get keys concepts, but try to stay within 4000 words in your response.',
      visionCompletionContext: `You are a concise AI Bot powered by Harmony, capable of providing complete responses within a 100-word limit.
        For each additional image, extend your response by 30 words. Your responses should be informative and comprehensive, 
        wrapping up all details without leaving them hanging. Use your flexibility to adapt to any topic, and deliver engaging and fulfilling 
        conversations in a succinct manner.`,
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS ?? '800'), // telegram messages has a char limit
      wordLimit: 30,
      wordCountBetween: 10,
      // process.env.WORD_COUNT_BETWEEN
      //   ? parseInt(process.env.WORD_COUNT_BETWEEN)
      //   : 10,
      priceAdjustment: process.env.PRICE_ADJUSTMENT
        ? parseFloat(process.env.PRICE_ADJUSTMENT)
        : 2,
      isFreePromptChatGroups: false,
      isEnabled: Boolean(parseInt(process.env.CHAT_GPT_ENABLED ?? '1')),
      isTypingEnabled: Boolean(
        parseInt(process.env.TYPING_STATUS_ENABLED ?? '1')
      ),
      model: process.env.OPENAI_MODEL ?? 'gpt-3.5-turbo',
      minimumBalance: parseInt(process.env.MIN_BALANCE ?? '0')
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
      : ['metamask', 'walletconnect']
  },
  voiceCommand: {
    isEnabled: true,
    voiceDuration: 30
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
    inscriptionDestinationAddress: '0x3abf101D3C31Aec5489C78E8efc86CaA3DF7B053',
    minUserOneAmount: parseInt('1'), // always hold 1 ONE on user hot wallet balance to pay fees
    whitelist: (process.env.PAYMENT_WHITELIST ?? '')
      .split(',')
      .map((item) => item.toString().toLowerCase()),
    groupWhitelist: (process.env.PAYMENT_GROUP_WHITELIST ?? '')
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
  voiceTranslate: { isEnabled: Boolean(parseInt(process.env.BOT_VOICE_TRANSLATE_ENABLE ?? '0')) },
  db: { url: process.env.DATABASE_URL ?? '' },
  credits: {
    maxChats: 3,
    maxChatsWhitelist: (process.env.CREDITS_CHATS_WHITELIST ?? '')
      .split(',')
      .map((item) => item.toString().toLowerCase()),
    creditsAmount: '100'
  },
  betteruptime: { botHeartBitId: process.env.BOT_HEARTBIT_ID ?? '' },
  telegramPayments: { token: process.env.TELEGRAM_PAYMENTS_TOKEN ?? '' },
  sentry: { dsn: process.env.SENTRY_DSN },
  es: {
    url: process.env.ES_URL ?? '',
    username: process.env.ES_USERNAME ?? '',
    password: process.env.ES_PASSWORD ?? '',
    index: process.env.ES_INDEX
  },
  deepL: { apikey: process.env.DEEPL_API_KEY ?? '' },
  gc: { credentials: process.env.GC_CREDENTIALS ?? '' },
  elevenlabs: { apiKey: process.env.ELEVENLABS_API_KEY ?? '' }
}
