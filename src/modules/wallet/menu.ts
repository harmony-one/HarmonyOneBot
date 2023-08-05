import { Menu } from "@grammyjs/menu";
import { BotContext } from "../types";
import { MenuIds } from "../../constants";

const helpText = `🏦 *One Wallet Help*

*1. HOW TO BUY $ONE*


*2. CREATING A WALLET*
• Use */wallet* to initiate wallet creation
• Follow the instructions that appear

*3. SENDING ONE TO ANOTHER ADDRESS*
• Use */wallet* send <ADDRESS> <AMOUNT>
Example: */wallet* send 0x199177Bcc7cdB22eC10E3A2DA888c7811275fc38 2.55

*4. WALLETCONNECT*
• Use */walletconnect*
`;

export const walletMenu = new Menu<BotContext>(MenuIds.WALLET_MAIN)
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
