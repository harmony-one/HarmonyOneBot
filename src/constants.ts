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
    backButton: 'Back to Main Menu',
    menuName: 'Main Menu',
  },
  imageMenu: {
    menuName: '👨‍🎨 Image Generation',
    backButton: 'Back to previous menu',
    helpText: `👨‍🎨 Image Generation

Help text for this menu
  `,
  
  }
}