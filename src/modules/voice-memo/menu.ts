import { Menu } from "@grammyjs/menu";
import { BotContext } from "../types";
import { MenuIds, menuText } from "../../constants";

export const voiceMemoMenuText = {
  helpText: `🎙 *Voice Memo Help*

*1. CREATE A SHORT SUMMARY FROM A VOICE MESSAGE*
• Send or forward a voice message (.m4a) from a private chat or group.`,
};

export const voiceMemoMenu = new Menu<BotContext>(MenuIds.VOICE_MEMO_MAIN)
  .row()
  .back(menuText.mainMenu.backButton, (ctx) => {
    ctx.editMessageText(menuText.mainMenu.menuName);
  });
