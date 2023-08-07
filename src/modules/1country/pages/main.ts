import { Menu } from "@grammyjs/menu";

import { BotContext } from "../../types";
import { MenuIds } from "../../../constants";

const help = `🌐 *1.country Help*

*1. ASSESS A DOMAIN'S STATUS*
• Use */check* <DOMAIN>

\`/check abcwebsite\`

*2. RENT A DOMAIN FOR 30 DAYS*
• Use */rent* <DOMAIN>

\`/rent abcwebsite\`

*3. RENEW A DOMAIN FOR 30 DAYS*
• Use */renew* <DOMAIN>

\`/renew abcwebsite\`
`;

export const oneCountryMainMenu = new Menu<BotContext>(MenuIds.ONE_COUNTRY_MAIN) //<MyContext>
  .text("Help", (ctx) =>
    ctx
      .editMessageText(help, {
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      })
      .catch((ex: any) => console.log("### ex", ex))
  )
  .row()
  .url("Go to 1.country", "https://1.country")
  .row()
  .back("Back to the Main Menu");
