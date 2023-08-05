import { Menu } from "@grammyjs/menu";
import { BotContext } from "../types";
import { MenuIds } from "../../constants";

const helpText = `🎙 *Voice Memo Help*

*1. CREATE A SHORT SUMMARY FROM A VOICE MESSAGE*
• Send or forward a voice message (.m4a) from a private chat or group.`;

export const voiceMemoMenu = new Menu<BotContext>(MenuIds.VOICE_MEMO_MAIN)
  .text("Help", (ctx) => {
    ctx
      .editMessageText(helpText, {
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      })
      .catch((ex: any) => {
        console.log("### ex", ex);
      });
  })
  .row()
  .back("⬅️ Back");
