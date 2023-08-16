export enum MenuIds {
  MAIN_MENU = "main-menu",
  IMAGE_MENU = "image-menu-main",
  QR_BOT_MAIN = "qrbot-menu-main",
  QR_BOT_CHANGE_OPTIONS = "qrbot-menu-change-options",
  QR_BOT_CHANGE_MARGIN = "qrbot-menu-change-margin",
  VOICE_MEMO_MAIN = "voice-memo-menu-main",
  SD_IMAGES_MAIN = "sd-images-menu-main",
  ONE_COUNTRY_MAIN = "one-country-main",
  IMAGE_GEN_MAIN = "image-gen-main",
  IMAGE_GEN_OPTIONS = "image-default-options",
  IMAGE_GEN_NUMBER = "image-gen-number",
  IMAGE_GEN_SIZE = "image-gen-size",
  WALLET_MAIN = "wallet-main",
  CHAT_GPT_MAIN = "chat-gpt-main",
  CHAT_GPT_MODEL = "chat-gpt-model",
}

// const balance = await payments.getAddressBalance(userWalletAddress);
//   const balanceOne = payments.toONE(balance, false).toFixed(2);
//   const startText = commandsHelpText.start
//     .replace("$CREDITS", balanceOne + "")
//     .replace("$WALLET_ADDRESS", userWalletAddress);


// Your credits: $CREDITS ONE tokens. Send to $WALLET_ADDRESS for recharge.

export const commandsHelpText = {
  start: `Hello, I am @harmony1bot, ONE Bot from Harmony AI 🧚‍♀️.

/ask act like elon musk, expand our q4 roadmap "telegram ai bot"

[/](https://t.me/harmony1bot?.%20act%20like%20mark%20zuckerberg%20instead) act like mark zuckerberg instead

/image glimpses of a herd of wild elephants crossing a savanna

/images vintage hot rod with custom flame paint job

/more Summarizing voice messages, artistic QR code, ChatGPT 32K, DALL-E, Wallet Connect, send tokens, sign transactions.

/help This tutorial. Docs at harmony.one/bot.
  
Your credits: $CREDITS ONE tokens. Send to [$WALLET_ADDRESS](https://explorer.harmony.one/address/$WALLET_ADDRESS) for recharge.
`,
  more: 
  `/qr s.country/ai astronaut, exuberant, anime girl, smile, sky, colorful

/connect # Wallet Connect to MetaMask / Gnosis Safe / Timeless

/send 0x742c4788CC47A94cf260abc474E2Fa45695a79Cd 42

/chat32 # “Ask Me Anything” via OpenAI ChatGPT-4 with 32K context

/memo # Send voice messages (via microphone button on bottom right of Telegram chat window), or upload .mp4 files


❤️‍🔥 [Join](https://xn--qv9h.s.country/p/dear-engineer-our-tech-lead-role) us to build [.country for bots](https://xn--qv9h.s.country/p/radically-fair-economy-for-1country)! [Coming SOON](https://xn--qv9h.s.country/p/generating-roadmap-as-ceo-vs-cto):

🧠 Web∞: CivitAI custom models (low-rank adaptations, clothes & accessories, human poses, comics & brand characters, video-to-video transformations), Character.AI celebrity chats, RunwayML video clips, HuggingFace embedding ControlNet, Meta segment anything, ElevenLabs speech clones, Zapier task automations, document or website queries.

🌳 Web3: self-custody wallets, token swaps, cross-chain bridges, fiat onramps, lending yields, collectible mints, price auctions, multi-signature safes, governance votes, portfolio management. 

🐝 Web2: news curation, gated access, emoji tipping, collective moments.

🏴‍☠️ Web1: .country domains, email aliases, vanity URLs, Notion/Substack hosting.
  `
};

export const menuText = {
  mainMenu: {
    backButton: "⬅️ Back",
    menuName: 'Main Menu',
    helpText: `*Main Menu*
     
🤖 welcome to the [harmony ONE bot](https://stse.substack.com/p/one-bot-for-all-generative-ai-on)! access ai models, agents, characters, services pay-per-use.`,
  },
  askMenu: {
    menuName: `💬 /ask ChatGPT4`,
    helpText: `*ask me anything*
        
\`/ask what is one intersting historical fact about technological development in the 2000s?\`
`,
  },
  imageMenu: {
    menuName: "📸 /image Stability",
    backButton: "⬅️ Back",
    helpText: `*make an image*
        
\`/image ancient, mysterious temple in a mountain range, surrounded by misty clouds and tall peaks
\`
  `,
  },
  voiceMemoMenu: {
    menuName: "🤩 /more",
    backButton: "⬅️ Back",
    helpText: commandsHelpText.more,
  },
};



// 0x742c4788CC47A94cf260abc474E2Fa45695a79Cd

// /images vintage hot rod with custom flame paint job

// /help - this help message
// /wallet - 🏦 Wallet
// /chat - 🖋️ ChatGPT 4
// /images - 🎨 Image Generation
// /qr - 📷 QR Generation
// /register - 🌐 1.country

// *EVENTS*
// The bot will produce a summary audio transcript when uploading a voice message.
