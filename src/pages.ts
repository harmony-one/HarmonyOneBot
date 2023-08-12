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
import { MenuIds, menuText } from "./constants";
import { walletMenu, walletMenuText } from "./modules/wallet/menu";

const imageMenu = new Menu<BotContext>(MenuIds.IMAGE_MENU)
  // .submenu(
  //   "🖼️ Image Generation Stable Diffusion",
  //   MenuIds.SD_IMAGES_MAIN,
  //   (ctx) => {
  //     ctx
  //       .editMessageText(sdImagesMenuText.helpText, {
  //         parse_mode: "Markdown",
  //       })
  //       .catch((ex: any) => {
  //         console.log("### ex", ex);
  //       });
  //   }
  // )
  // .row()
  // .submenu("🎨 Image Generation DALL·E 2", MenuIds.IMAGE_GEN_MAIN, (ctx) => {
  //   ctx
  //     .editMessageText(openAiMenuText.helpText, {
  //       parse_mode: "Markdown",
  //     })
  //     .catch((ex: any) => {
  //       console.log("### ex", ex);
  //     });
  // })
  .row()
  .back(menuText.mainMenu.backButton, (ctx) => {
    ctx.editMessageText(menuText.mainMenu.menuName).catch((ex) => {
      console.log("### ex", ex);
    });
  });

export const mainMenu = new Menu<BotContext>(MenuIds.MAIN_MENU)
  .submenu(menuText.askMenu.menuName, MenuIds.CHAT_GPT_MAIN, (ctx) => {
    ctx
      .editMessageText(menuText.askMenu.helpText, {
        parse_mode: "Markdown",
      })
      .catch((ex: any) => {
        console.log("### ex", ex);
      });
  })
  .row()
  .submenu(menuText.imageMenu.menuName, MenuIds.IMAGE_MENU, (ctx) => {
    ctx
      .editMessageText(menuText.imageMenu.helpText, {
        parse_mode: "Markdown",
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

// .row()
// .submenu("💰 Bot Fund", MenuIds.WALLET_MAIN, (ctx) => {
//   ctx
//     .editMessageText(walletMenuText.helpText, {
//       parse_mode: "Markdown",
//     })
//     .catch((ex: any) => {
//       console.log("### ex", ex);
//     });
// })

// .submenu("🌐 1.country", MenuIds.ONE_COUNTRY_MAIN, (ctx) => {
//   ctx
//     .editMessageText(onCountryMenuText.helpText, {
//       parse_mode: "Markdown",
//     })
//     .catch((ex: any) => {
//       console.log("### ex", ex);
//     });
// })
// .row()

// .row()
// .submenu("📷 QR Generation", MenuIds.QR_BOT_MAIN, (ctx) => {
//   ctx
//     .editMessageText(qrCodeMenuText.helpText, {
//       parse_mode: "Markdown",
//     })
//     .catch((ex: any) => {
//       console.log("### ex", ex);
//     });
// });

// .row()
// .text("Close", async (ctx) => {
//   await ctx.editMessageText("Bye");
//   ctx.menu.close();
// });

imageMenu.register(sdImagesMenu);
imageMenu.register(imageGenMainMenu);
mainMenu.register(imageMenu);
mainMenu.register(qrCodeBotMenu);
mainMenu.register(voiceMemoMenu);
mainMenu.register(walletMenu);
mainMenu.register(chatMainMenu);

// mainMenu.register(oneCountryMainMenu);
// mainMenu.register(imageGenMainMenu);
