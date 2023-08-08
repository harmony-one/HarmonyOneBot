import { Menu } from "@grammyjs/menu";
import { BotContext } from "../types";
import { MenuIds, menuText } from "../../constants";

export const walletMenuText = {
  helpText: `🏦 *One Wallet Help*

*1. HOW TO BUY $ONE*
• Buy [here](https://harmony.one/buy)

*2. CREATING A WALLET*
• Use */wallet* to initiate wallet creation
• Follow the instructions that appear

*3. SENDING ONE TO ANOTHER ADDRESS*
• Use */wallet* send <ADDRESS> <AMOUNT>

\`/wallet send 0x199177Bcc7cdB22eC10E3A2DA888c7811275fc38 2.55\`

*4. WALLETCONNECT*
• Use */walletconnect*

  `,
};

export const walletMenu = new Menu<BotContext>(MenuIds.WALLET_MAIN).back(
  menuText.mainMenu.backButton,
  (ctx) => {
    ctx.editMessageText(menuText.mainMenu.menuName);
  }
);
