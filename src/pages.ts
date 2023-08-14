import { Menu } from "@grammyjs/menu";
import { chatMainMenu } from "./modules/open-ai/pages/chatPage";
import { BotContext } from "./modules/types";
import { sdImagesMenu } from "./modules/sd-images/menu";
import { voiceMemoMenu } from "./modules/voice-memo/menu";
import { MenuIds, menuText } from "./constants";
// import { walletMenu } from "./modules/wallet/menu";
// import { qrCodeBotMenu } from "./modules/qrcode/menu";

export const mainMenu = new Menu<BotContext>(MenuIds.MAIN_MENU)
  .submenu(menuText.askMenu.menuName, MenuIds.CHAT_GPT_MAIN, (ctx) => {
    ctx
      .editMessageText(menuText.askMenu.helpText, {
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      })
      .catch((ex: any) => {
        console.log("### ex", ex);
      });
  })
  .row()
  .submenu(menuText.imageMenu.menuName, MenuIds.SD_IMAGES_MAIN, (ctx) => {
    ctx
      .editMessageText(menuText.imageMenu.helpText, {
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      })
      .catch((ex: any) => {
        console.log("### ex", ex);
      });
  })
  .row()
  .submenu(menuText.voiceMemoMenu.menuName, MenuIds.VOICE_MEMO_MAIN, (ctx) => {
    ctx
      .editMessageText(menuText.voiceMemoMenu.helpText, {
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      })
      .catch((ex: any) => {
        console.log("### ex", ex);
      });
  });

mainMenu.register(sdImagesMenu);
// mainMenu.register(qrCodeBotMenu);
mainMenu.register(voiceMemoMenu);
// mainMenu.register(walletMenu);
mainMenu.register(chatMainMenu);
