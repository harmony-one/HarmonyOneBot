export enum MenuIds {
  MAIN_MENU = "main-menu",
  IMAGE_MENU = 'image-menu-main',
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

export const menuText = {
  mainMenu: {
    backButton: '⬅️ Back',
    menuName: `
    Main Menu
  
🌟 Welcome to the Harmony One Bot! 🤖
  
💲 Send money to your /botfund to start! 🚀
    `,
  },
  imageMenu: {
    menuName: '👨‍🎨 Image Generation',
    backButton: '⬅️ Back',
    helpText: `🖼️ *Stable Diffusion Help*

    *1. GENERATE A SINGLE IMAGE*
    • Use */image <PROMPTS>*

    *Example:* \`/image On a sunny day city street, neon signs and streetlights reflect off the wet pavement. Pedestrians hustle with umbrellas, and cars pass with headlights gleaming. Painted with hyperrealistic precision, inspired by artists like Chuck Close, this scene captures every droplet and glint of light, creating an image so lifelike it appears almost like a photograph.
    \`
    
    *2. GENERAGE MULTIPLE IMAGES*
    • Use */images <PROMPTS>*

    *Example:* \`/images A futuristic cityscape with towering skyscrapers, flying vehicles, and a diverse population of humans and robots, painted in a concept art style inspired by Syd Mead, with a focus on detail and realism.
    \`
    
      `,
  
  }
}

export const commandHelpText = `*Commands*
/start - Begin interaction with the bot
/help - Access help information

*Wallet*
/botfund - View botfund balance
/connect - Use walletconnect to pair external wallet
/get - View external wallet balance
/send <ADDRESS> <AMOUNT> - Send funds from external wallet

*Voice Memo*
Send or forward a voice message (.m4a) to @HarmonyOneAIBot for a full transcript and summary

*QR Code Generation*
/qr <LINK> <PROMPT>

*ChatGPT*
/chat <TEXT>

*Image Generation*
/image <PROMPT>
/images <PROMPT>

`




// /help - this help message
// /wallet - 🏦 Wallet 
// /chat - 🖋️ ChatGPT 4 
// /images - 🎨 Image Generation 
// /qr - 📷 QR Generation 
// /register - 🌐 1.country 

// *EVENTS*
// The bot will produce a summary audio transcript when uploading a voice message.