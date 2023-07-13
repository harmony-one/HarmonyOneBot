import { Menu } from "@grammyjs/menu";
import { BotContext } from "../types";
import { MenuIds } from "../../constants";

const helpText = `🏦 *One Wallet Help*

*Commands*

To create a wallet, enter the command */wallet* and follow the further instructions.

*Example:*

\`/wallet\`

To send ONE to another address, enter the command /wallet send ADDRESS AMOUNT.

*Example:*
/wallet send 0x199177Bcc7cdB22eC10E3A2DA888c7811275fc38 0.01
`;

export const walletMenu = new Menu<BotContext>(MenuIds.WALLET_MAIN)
  .text("Help", (ctx) => {
    ctx.editMessageText(helpText, {parse_mode: 'Markdown', disable_web_page_preview: true}).catch((ex) => {
      console.log('### ex', ex);
    })
  })
  .row()
  .back("⬅️ Back");
