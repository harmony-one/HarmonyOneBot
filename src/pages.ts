import { Menu } from "@grammyjs/menu";
import { imageGenMainMenu } from "./modules/image-gen/pages/main";
import { oneCountryMainMenu } from './modules/1country/pages/main'
import { BotContext } from "./modules/types";
import { qrCodeBotMenu } from "./modules/qrcode/menu";
import { sdImagesMenu } from "./modules/sd-images/menu";
import { voiceMemoMenu } from "./modules/voice-memo/menu";
import {MenuIds} from "./constants";
import {appText} from "./modules/image-gen/utils/text";
import {walletMenu} from "./modules/wallet/menu";

export const mainMenu = new Menu<BotContext>(MenuIds.MAIN_MENU)
  .submenu("🏦 One Wallet", MenuIds.WALLET_MAIN)
  .row()
  .submenu('🌐 1.country', MenuIds.ONE_COUNTRY_MAIN)
  .row()
  .submenu('🎙 Voice Memo', MenuIds.VOICE_MEMO_MAIN)
  .row()
  .submenu('📷 QR Generation', MenuIds.QR_BOT_MAIN)
  .row()
  .submenu('🖼️ Image Generation Stable Diffusion', MenuIds.SD_IMAGES_MAIN)
  .row()
  .submenu("🖌️ Image Generation AI", MenuIds.IMAGE_GEN_MAIN)
  .row()
  .text("Close", async (ctx) => {
    await ctx.editMessageText('Bye');
    ctx.menu.close()
  });

mainMenu.register(imageGenMainMenu);
mainMenu.register(oneCountryMainMenu)
mainMenu.register(qrCodeBotMenu);
mainMenu.register(sdImagesMenu);
mainMenu.register(voiceMemoMenu);
mainMenu.register(walletMenu);
