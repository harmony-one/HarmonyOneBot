import { Menu } from "@grammyjs/menu";

import { BotContext } from "../../types";

const help = `
<b>Commands</b>
/check [domain] - Check a 1.country domain status
/cert [domain] - Check domain's cert status
/nft [domain] - Check domain's nft metadata status
`;

export const oneCountryMainMenu = new Menu<BotContext>("one-country-main") //<MyContext>
  .text("Help", (ctx) => ctx.reply(help, { parse_mode: "HTML", }))
  .row()
  .url("Go to 1.country", "https://1.country")
  .row()
  .back("Back to the Main Menu");
