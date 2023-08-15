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
  start: `Hello, I am @HarmonyOneAIBot, ONE Bot from Harmony AI 🧚‍♀️. Type

/ask Ask me anything (OpenAI ChatGPT-4). Or, / without "ask".
/image Make a photo (Stable Diffusion XL). Or, /images for multiple.
/help This tutorial. Docs at harmony.one/bot. Examples:

/ask act like elon musk, expand our q4 roadmap "telegram ai bot"

/ act like mark zuckerberg instead

/image glimpses of a herd of wild elephants crossing a savanna

/images vintage hot rod with custom flame paint job

/more Other commands for summarizing voice messages, artistic QR code, Wallet Connect, ChatGPT 32K, DALL-E.

Soon: 🧠 Web∞ (CivitAI custom models, Character.AI celebrity chats, RunwayML video clips, HuggingFace embed ControlNet, ElevenLabs speech clones, Zapier task automations) + 🌳 Web3 (self-custody wallets, token swaps, fiat onramps, collectible mints, price auctions, multi-signature safes, governance votes) + 🐝 Web2 (news curation, gated access, emoji tipping) + 🏴‍☠️ Web1 (.country domains, email aliases, vanity URLs, Notion/Substack hosting).

Your credits: *$CREDITS* ONE tokens.
Send to [$WALLET_ADDRESS](https://explorer.harmony.one/address/$WALLET_ADDRESS) for recharge.
`,
  more: 
  ` 
/qr s.country/ai astronaut, exuberant, anime girl, smile, sky, colorful

/ask rewrite harmony.one/poster like apple press release

/image ancient, mysterious temple in a mountain range, surrounded by misty clouds and tall peaks

/image beautiful waterfall in a lush jungle, with sunlight shining through the trees

/image epic long distance cityscape photo of New York City flooded by the ocean and overgrown buildings and jungle ruins in rainforest, at sunset, cinematic shot, highly detailed, 8k, golden light

/image girl with slightly shocked facial expression, looking out at the many hands holding out phones in front of her (like reporters with microphones), with many social media icons surrounding her, including paper letters with hearts on them, in the style of children's book illustrator, rough crayon brushstrokes, rough-edged 2d animation, fred calleri

/image cracked or broken sculpture art of two people holding hands, mirror polished, stainless steel, heavenly sunset sky, shot from below, in the style of michael benisty

/images birds-eye view, 8k, realistic, *location* for [farm], [racetrack], [las vegas], [beach], [island], [forrest]

/image *in the shape of this logo* for [island], [clear blue ocean water surrounding], [photo taken from above], [global], beautiful and vibrant]

/image (masterpiece, best quality, detailed:1.2), 1girl, adult female, ginger hair, small braids, blue eyes, freckles, smile, red short sleeved flannel shirt, knee-length denim shorts, sitting in a colorful flower field, looking at the sky, birds in the sky, dreamy mood, magical. [negative: child, kid, underage, teen, worst quality, extra digits, watermark, signature:1.2]
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
    menuName: `💬 /ask Ask me anything`,
    helpText: `*ask me anything*
        
\`/ask what is one intersting historical fact about technological development in the 2000s?\`
`,
  },
  imageMenu: {
    menuName: "📸 /image Make a photo",
    backButton: "⬅️ Back",
    helpText: `*make an image*
        
\`/image ancient, mysterious temple in a mountain range, surrounded by misty clouds and tall peaks
\`
  `,
  },
  voiceMemoMenu: {
    menuName: "🤩 /more Other commands",
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
