import { Menu } from "@grammyjs/menu";
import { BotContext } from "../types";
import { MenuIds } from "../../constants";

const helpText = `🏦 *One Wallet Help*

*Creating a Wallet:*

1. Enter */wallet*.
2. Follow the instructions that appear.

*Sending ONE to Another Address:*

1. Enter: */wallet* send <ADDRESS> <AMOUNT>

Example:

*/wallet* send 0x199177Bcc7cdB22eC10E3A2DA888c7811275fc38 2.55
`;

export const walletMenu = new Menu<BotContext>(MenuIds.WALLET_MAIN)
  .text("Help", (ctx) => {
    ctx.editMessageText(helpText, {parse_mode: 'Markdown', disable_web_page_preview: true}).catch((ex) => {
      console.log('### ex', ex);
    })
  })
  .row()
  .back("⬅️ Back");
