import { Menu } from "@grammyjs/menu";
import { imageGenMainMenu } from "./modules/open-ai/pages/main";
import { oneCountryMainMenu } from "./modules/1country/pages/main";
import { BotContext } from "./modules/types";
import { qrCodeBotMenu } from "./modules/qrcode/menu";
import { sdImagesMenu } from "./modules/sd-images/menu";
import { voiceMemoMenu } from "./modules/voice-memo/menu";
import { MenuIds } from "./constants";
import { appText } from "./modules/open-ai/utils/text";
import { walletMenu } from "./modules/wallet/menu";

export const mainMenu = new Menu<BotContext>(MenuIds.MAIN_MENU)
  .submenu("🏦 One Wallet", MenuIds.WALLET_MAIN, (ctx) => {
    ctx.editMessageText("🏦 One Wallet");
  })
  .row()
  .submenu("🌐 1.country", MenuIds.ONE_COUNTRY_MAIN, (ctx) => {
    ctx.editMessageText("🌐 1.country");
  })
  .row()
  .submenu("🎙 Voice Memo", MenuIds.VOICE_MEMO_MAIN, (ctx) => {
    ctx.editMessageText("🎙 Voice Memo");
  })
  .row()
  .submenu("📷 QR Generation", MenuIds.QR_BOT_MAIN, (ctx) => {
    ctx.editMessageText("📷 QR Generation");
  })
  .row()
  .submenu(
    "🖼️ Image Generation Stable Diffusion",
    MenuIds.SD_IMAGES_MAIN,
    (ctx) => {
      ctx.editMessageText("🖼️ Image Generation Stable Diffusion");
    }
  )
  .row()
  .submenu("🖌️ Image Generation DALL·E 2", MenuIds.IMAGE_GEN_MAIN, (ctx) => {
    ctx.editMessageText("🖌️ Image Generation DALL·E 2");
  })
  .row()
  .text("Close", async (ctx) => {
    await ctx.editMessageText("Bye");
    ctx.menu.close();
  });

mainMenu.register(imageGenMainMenu);
mainMenu.register(oneCountryMainMenu);
mainMenu.register(qrCodeBotMenu);
mainMenu.register(sdImagesMenu);
mainMenu.register(voiceMemoMenu);
mainMenu.register(walletMenu);
