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
  start: `Hello, I'm ONE Bot on Telegram from Harmony – for ALL your AI wishes 🧚‍♀️.

/ask act like elon musk, expand our q4 roadmap "telegram ai bot"
/ask act like mark zuckerberg instead

/image glimpses of a herd of wild elephants crossing a savanna

/more Summarize voice messages, artistic QR code, ChatGPT 32K, DALL-E, Wallet Connect, send tokens, sign transactions...

/help Show this message. Join user group @onebotlove or read docs at harmony.one/bot.
  
Your credits in ONE tokens: $CREDITS

Send to: \`$WALLET_ADDRESS\`
`,
  more: 
  `/ explain like i am 5, what is a superconductor?
. explain like i have a phd, what is category theory?

/images vintage hot rod with custom flame paint job

/qr s.country/ai astronaut, exuberant, anime girl, smile, sky, colorful

/connect (Wallet Connect to MetaMask / Gnosis Safe / Timeless)

/send TARGET-WALLET-ADDRESS ONE-TOKEN-AMOUNT
/send 0x742c4788CC47A94cf260abc474E2Fa45695a79Cd 42

/chat32 ("Ask Me Anything” via OpenAI ChatGPT-4 with 32K context)

/memo (Send voice messages via microphone button on bottom right)


❤️‍🔥 [Join our team](https://xn--qv9h.s.country/p/dear-engineer-our-tech-lead-role) to build [AI ∩ Crypto](https://xn--qv9h.s.country/p/radically-fair-economy-for-1country)! [Product roadmap](https://xn--qv9h.s.country/p/generating-roadmap-as-ceo-vs-cto):

[🧠 Web∞](https://xn--qv9h.s.country/p/learning-machine-cryptography): CivitAI custom models (low-rank adaptations, clothes & accessories, human poses, comics & brand characters, video-to-video transformations), Character.AI celebrity chats, RunwayML video clips, HuggingFace embedding ControlNet, Meta segment anything, ElevenLabs speech clones, Zapier task automations, document or website queries.

[🌳 Web3](https://xn--qv9h.s.country/p/telegram-bots-and-clients-self-custody): self-custody wallets, token swaps, cross-chain bridges, fiat onramps, lending yields, collectible mints, price auctions, multi-signature safes, governance votes, portfolio management, .1 name services. 

[🐝 Web2](https://xn--qv9h.s.country/p/new-forum-for-ai-crypto-reddit-discourse): news curation, gated access, emoji tipping, collective moments, group discount, social commerce.

[🏴‍☠️ Web1](https://xn--qv9h.s.country/p/controlnet-lora-1country-qr-code): .country domains, email aliases, vanity URLs, Notion/Substack hosting.
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
        
\`/ask act like elon musk, expand our q4 roadmap "telegram ai bot"\`
`,
  },
  imageMenu: {
    menuName: "📸 /image Stability",
    backButton: "⬅️ Back",
    helpText: `*make an image*
        
\`/image glimpses of a herd of wild elephants crossing a savanna
\`
  `,
  },
  voiceMemoMenu: {
    menuName: "🤩 /more",
    backButton: "⬅️ Back",
    helpText: commandsHelpText.more,
  },
};


export const NEGATIVE_PROMPT = {
  image: "(KHFB, AuroraNegative),(Worst Quality, Low Quality:1.4), ugly, tiling, poorly drawn hands, poorly drawn feet, poorly drawn face, out of frame, extra limbs, disfigured, deformed, body out of frame, bad anatomy, watermark, signature, cut off, low contrast, underexposed, overexposed, bad art, beginner, amateur, distorted face, blurry, draft, grainy, boobs, penis, nudity, mohammad, prophet mohammad, sex, porn, sexual"
}

export const TERMS = {
  text: `1. Overview
Welcome to our Telegram Bot. The following Terms of Service ("Terms") outline your rights and responsibilities when using our Bot ("Service"), which is owned and operated by Harmony ONE. By engaging with our Service, you are accepting and agreeing to abide by these Terms.
  
2. Usage License
We grant you a limited, non-exclusive, non-sublicensable, non-transferable, and revocable license to use our Service, as long as you remain in compliance with these Terms.

3. Expected Behavior
While using our Service, you commit to:
• Refrain from spamming.
• Not engage in illegal activities.
• Respect the rights of others.
• Avoid actions that could harm or disrupt the functionality of the Service.

4. Your Content
You maintain ownership rights over any content you share via our Bot. Yet, when you post, you provide us a global, royalty-free, non-exclusive license to use, adapt, modify, circulate, reproduce, and showcase that content.

5. Privacy Considerations
Your privacy is important. Our collection and treatment of personal data in relation to the Service are detailed in our Privacy Policy.

6. Updates to These Terms
We might update these Terms occasionally. When we do, we'll revise the date at the start of the Terms. If you continue using our Service after an update, it means you accept and agree to the changes.

7. Termination Rights
We reserve the right to suspend or terminate your access to our Service without warning, particularly if you do not comply with our Terms.

8. Addressing Disagreements
Should any disagreement arise from these Terms or the Service, it will be addressed based on the laws of [Your Jurisdiction], disregarding any conflicting legal principles.

9. Reach Out to Us
Questions or concerns regarding these Terms? We're here to help. Please get in touch at @theofandrich.
  `
}

export const SUPPORT = {
  text: `Please reach out to @theofandrich for support.`
}

export const FEEDBACK = {
  text: `Please reach out to @theofandrich to share feedback.`
}
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
