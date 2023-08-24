import { Menu } from "@grammyjs/menu";
import { BotContext } from "../types";
import { MenuIds, menuText } from "../../constants";

export const walletMenuText = {
  helpText: `💰 *Credits*

1. /buy - Buy ONE with USD

2. /connect - Connect your wallet

3. /send <ADDRESS> <AMOUNT> - Send Tokens

Example: \`/send 0x199177Bcc7cdB22eC10E3A2DA888c7811275fc38 2.55\`


  `,
};

export const walletMenu = new Menu<BotContext>(MenuIds.WALLET_MAIN).back(
  menuText.mainMenu.backButton,
  (ctx) => {
    return ctx.editMessageText(menuText.mainMenu.menuName).catch((ex) => {
      console.log('### ex', ex);
    });
  }
);
