import { Menu } from "@grammyjs/menu";
import {
  imageGenMainMenu,
  openAiMenuText,
} from "./modules/open-ai/pages/imagePage";
import {
  chatGptMenuText,
  chatMainMenu,
} from "./modules/open-ai/pages/chatPage";
import {
  onCountryMenuText,
  oneCountryMainMenu,
} from "./modules/1country/pages/main";
import { BotContext } from "./modules/types";
import { qrCodeBotMenu, qrCodeMenuText } from "./modules/qrcode/menu";
import { sdImagesMenu, sdImagesMenuText } from "./modules/sd-images/menu";
import { voiceMemoMenu, voiceMemoMenuText } from "./modules/voice-memo/menu";
import { MenuIds } from "./constants";
import { walletMenu, walletMenuText } from "./modules/wallet/menu";

export const mainMenu = new Menu<BotContext>(MenuIds.MAIN_MENU)
  .submenu("🏦 One Wallet", MenuIds.WALLET_MAIN, (ctx) => {
    ctx
      .editMessageText(walletMenuText.helpText, {
        parse_mode: "Markdown",
      })
      .catch((ex: any) => {
        console.log("### ex", ex);
      });
  })
  .row()
  .submenu("🌐 1.country", MenuIds.ONE_COUNTRY_MAIN, (ctx) => {
    ctx
      .editMessageText(onCountryMenuText.helpText, {
        parse_mode: "Markdown",
      })
      .catch((ex: any) => {
        console.log("### ex", ex);
      });
  })
  .row()
  .submenu("🎙 Voice Memo", MenuIds.VOICE_MEMO_MAIN, (ctx) => {
    ctx
      .editMessageText(voiceMemoMenuText.helpText, {
        parse_mode: "Markdown",
      })
      .catch((ex: any) => {
        console.log("### ex", ex);
      });
  })
  .row()
  .submenu("📷 QR Generation", MenuIds.QR_BOT_MAIN, (ctx) => {
    ctx
      .editMessageText(qrCodeMenuText.helpText, {
        parse_mode: "Markdown",
      })
      .catch((ex: any) => {
        console.log("### ex", ex);
      });
  })
  .row()
  .submenu("🖌️ Chat Gpt 4", MenuIds.CHAT_GPT_MAIN, (ctx) => {
    ctx
      .editMessageText(chatGptMenuText.helpText, {
        parse_mode: "Markdown",
      })
      .catch((ex: any) => {
        console.log("### ex", ex);
      });
  })
  .row()
  .submenu(
    "🖼️ Image Generation Stable Diffusion",
    MenuIds.SD_IMAGES_MAIN,
    (ctx) => {
      ctx
        .editMessageText(sdImagesMenuText.helpText, {
          parse_mode: "Markdown",
          disable_web_page_preview: true,
        })
        .catch((ex: any) => {
          console.log("### ex", ex);
        });
    }
  )
  .row()
  .submenu("🎨 Image Generation DALL·E 2", MenuIds.IMAGE_GEN_MAIN, (ctx) => {
    ctx
      .editMessageText(openAiMenuText.helpText, {
        parse_mode: "Markdown",
      })
      .catch((ex: any) => {
        console.log("### ex", ex);
      });
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
mainMenu.register(chatMainMenu);
