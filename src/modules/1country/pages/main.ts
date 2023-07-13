import { Menu } from "@grammyjs/menu";

import { BotContext } from "../../types";
import {MenuIds} from "../../../constants";

const help = `🌐 *1.country Help*

*Commands*

/check [domain] - Check a 1.country domain status
/cert [domain] - Check domain's cert status
/nft [domain] - Check domain's nft metadata status
`;

export const oneCountryMainMenu = new Menu<BotContext>(MenuIds.ONE_COUNTRY_MAIN) //<MyContext>
  .text("Help", (ctx) => ctx.editMessageText(help, { parse_mode: "Markdown", }).catch((ex) => console.log('### ex', ex)))
  .row()
  .url("Go to 1.country", "https://1.country")
  .row()
  .back("Back to the Main Menu");
