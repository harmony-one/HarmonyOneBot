import { Menu } from "@grammyjs/menu";
import {BotContext, MenuContext} from "../types";
import {MenuIds} from "../../constants";

const helpText = `📷 *QR Generation Help* 

*1. GENERATE A QR CODE*
• Use */qr* <LINK> <PROMPTS>
Example: \/qr https://h.country/ai astronaut, sky, colorful\


Send a message with the "qr" command and your prompts:
/qr *LINK* *PROMPTS*.

*Example:*
\`/qr https://h.country/ai astronaut, sky, colorful\`

*Change options*

You can change following options.

- *QR Code Margin* - Define how much wide the quiet zone should be.
`;

export const qrCodeBotMenu = new Menu<BotContext>(MenuIds.QR_BOT_MAIN) //<MyContext>
  .text("Help", (ctx) => {
    ctx.editMessageText(helpText, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    }).catch((ex: any) => {
      console.log('### ex', ex);
    })
  })
  .row()
  .text("Change options", async (ctx) => {
    await ctx.menu.nav(MenuIds.QR_BOT_CHANGE_OPTIONS)
  })
  .row()
  .back("⬅️ Back");

const qrChooseOptionsMenu = new Menu<BotContext>(MenuIds.QR_BOT_CHANGE_OPTIONS)
  .submenu((ctx) => `QR Code Margin: ${ctx.session.qrMargin}`, MenuIds.QR_BOT_CHANGE_MARGIN)
  .row()
  .back("⬅️ Back");

const qrChangeMarginMenu = new Menu<BotContext>(MenuIds.QR_BOT_CHANGE_MARGIN)
  .text("0", (ctx) => setMargin(ctx, 0))
  .text("1", (ctx) => setMargin(ctx, 1))
  .text("2", (ctx) => setMargin(ctx, 2))
  .text("3", (ctx) => setMargin(ctx, 3))
  .text("4", (ctx) => setMargin(ctx, 4))
  .text("5", (ctx) => setMargin(ctx, 5))
  .row()
  .back("⬅️ Back");

async function setMargin(ctx: MenuContext, n: number) {
  ctx.session.qrMargin = n;
  await ctx.menu.back();
}

qrCodeBotMenu.register(qrChooseOptionsMenu);
qrChooseOptionsMenu.register(qrChangeMarginMenu);
