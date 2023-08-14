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
export const commandsHelpText = {
  start: `*Hello, I am @HarmonyOneAIBot, ONE Bot from Harmony AI 🧚‍♀️* 
  
Type:

/ask Ask me anything (OpenAI ChatGPT-4). Or, / without "ask".
/image Make a photo (Stable Diffusion XL). Or, /images for multiple.
/help This tutorial. Docs at harmony.one/bot

Examples:
_/ask act like elon musk, expand our q4 roadmap "telegram ai bot"
> act like mark zuckerberg instead_

/image glimpses of a herd of wild elephants crossing a savanna
/more Other commands for voice memo summary, artistic QR code, Wallet Connect, ChatGPT 32K, DALL-E.

*Soon:* 🧠 Web ∞ (CivitAI embed models, Character.AI celebrity chats, RunwayML video clips, HuggingFace LoRa/ControlNet, ElevenLabs speech clones, Zapier task automations) + 🌳 Web3 (self-custody wallets, token swaps, collectible mints, price auctions, multi-signature safes, governance votes) + 🐝 Web2 (news curation, gated access, emoji tipping) + 🏴‍☠️ Web1 (.country domains, vanity URLs, Notion/Substack hosting).

Your Credits: *$CREDITS ONE* tokens. 

Send to \`$WALLET_ADDRESS\` for recharge.

+-----------------------------+
| 💬 /ask Ask me anything       |
+-----------------------------+
| 📸 /image Make a photo        |
+-----------------------------+
| 🤩 /more Other commands   |
+-----------------------------+
`,
  more: 
  ` 
  *| 💬 More Options |*
  /more - See this menu
  /start - Get started with core uses
  /help - Access all features

*| 🧠 Ask Me Anything |*
  /ask What was the greatest invention in the 1960's? 

*| 📸 Images and Visuals |*
  \`/image Intricate dynamic action shot of cowboy riding a horse, cinematic Steve Henderson Fabian Perez Henry Asencio Jeremy Mann Marc Simonetti Fantasy, red dead redemption 2 atmosphere, cinematic, photograph\`
  \n\`/images close up headshot, futuristic young woman, wild hair sly smile in front of gigantic UFO, dslr, sharp focus, dynamic composition\`
  \n\`/qr h.country Dramatic bonfire on a remote beach, captured at the magic hour with flames dancing against the twilight sky; using a shallow depth of field\`
  
*| 🎙️ Voice Messages |*
  Send a voice message (.m4a) to me for a transcript and summary.
  
*| 💰 Wallet and Balance |*
  /balance - Check balance
  /connect - Use walletconnect to pair external wallet
  /send ADDRESS AMOUNT - Send funds from walletconnect
  `
};

export const menuText = {
  mainMenu: {
    backButton: "⬅️ Back",
    menuName: commandsHelpText.start,
    helpText: `*Main Menu*
     
🤖 welcome to the [harmony ONE bot](https://stse.substack.com/p/one-bot-for-all-generative-ai-on)! access ai models, agents, characters, services pay-per-use.`,
  },
  askMenu: {
    menuName: `ask me anything`,
    helpText: `*ask me anything*
        
\`/ask what is one intersting historical fact about technological development in the 2000s?\`
`,
  },
  imageMenu: {
    menuName: "make an image",
    backButton: "⬅️ Back",
    helpText: `*make an image*
        
\`/image a futuristic cityscape with towering skyscrapers, flying vehicles, and a diverse population of humans and robots, painted in a concept art style inspired by Syd Mead, with a focus on detail and realism.\`
  `,
  },
  voiceMemoMenu: {
    menuName: "voice memo",
    backButton: "⬅️ Back",
    helpText: `*voice memo*
    
send a voice message to me for a transcript and summary.`,
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
