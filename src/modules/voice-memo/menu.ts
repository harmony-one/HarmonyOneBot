import { Menu } from "@grammyjs/menu";
import { BotContext } from "../types";
import { MenuIds, commandsHelpText, menuText } from "../../constants";
import { getStartMenuText } from "../../pages";

export const voiceMemoMenuText = {
  helpText: `🎙 *Voice Memo Help*

1. CREATE A SHORT SUMMARY FROM A VOICE MESSAGE

• Send or forward a voice message (.m4a) from a private chat or group.`,
};

export const voiceMemoMenu = new Menu<BotContext>(MenuIds.VOICE_MEMO_MAIN)
  .row()
  .back(menuText.mainMenu.backButton, async (ctx) => {
    const text = await getStartMenuText(ctx) || ""
    ctx.editMessageText(text, {
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    }).catch((ex) => {
      console.log('### ex', ex);
    });
  });
