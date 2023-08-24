import { Menu } from "@grammyjs/menu";
import { BotContext } from "../types";
import { MenuIds } from "../../constants";

const helpText = `🏦 *Wallet Connect Help*

*Creating a Wallet:*

1. Enter */walletc*.
2. Follow the instructions that appear.

*Sending ONE to Another Address:*

1. Enter: */walletc* send <ADDRESS> <AMOUNT>

Example:

*/walletc* send 0x199177Bcc7cdB22eC10E3A2DA888c7811275fc38 2.55
`;

export const walletMenu = new Menu<BotContext>(MenuIds.WALLET_MAIN)
  .text("Help", (ctx) => {
    return ctx
      .editMessageText(helpText, {
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      })
      .catch((ex) => {
        console.log("### ex", ex);
      });
  })
  .row()
  .back("⬅️ Back");
