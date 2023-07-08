import { Menu } from "@grammyjs/menu";
import {BotContext, MenuContext} from "../types";

export enum QRBotMenuIds {
  MAIN = 'qrbot-menu-main',
  CHANGE_OPTIONS = 'qrbot-menu-change-options',
  CHANGE_MARGIN = 'qrbot-menu-change-margin',
}

const helpText = `<b>Help</b>
Send a message with the "qr" command and your prompts:
/qr LINK PROMPTS.

<b>Example:</b> /qr https://h.country/ai astronaut, sky, colorful`;

const changeMarginText = `
<b>Change options</b>
You can change following options.

- <b>QR Code Margin</b> - Define how much wide the quiet zone should be.
`

export const qrCodeBotMenu = new Menu<BotContext>(QRBotMenuIds.MAIN) //<MyContext>
  .text("Help", async (ctx) => {
    await ctx.menu.close();
    ctx.reply(helpText, {
      parse_mode: "HTML",
      reply_markup: qrCodeBotMenu,
      disable_web_page_preview: true,
    });
  })
  .row()
  .text("Change options", async (ctx) => {
    await ctx.menu.close();
    ctx.reply(changeMarginText, {
      parse_mode: "HTML",
      reply_markup: qrChooseOptionsMenu,
      disable_web_page_preview: true
    })
  })
  .row()
  .back("Back");

const qrChooseOptionsMenu = new Menu<BotContext>(QRBotMenuIds.CHANGE_OPTIONS)
  .submenu("QR Code Margin", QRBotMenuIds.CHANGE_MARGIN)
  .row()
  .back("Back");

const qrChangeMarginMenu = new Menu<BotContext>(QRBotMenuIds.CHANGE_MARGIN)
  .text("0", (ctx) => setMargin(ctx, 0))
  .text("1", (ctx) => setMargin(ctx, 1))
  .text("2", (ctx) => setMargin(ctx, 2))
  .text("3", (ctx) => setMargin(ctx, 3))
  .text("4", (ctx) => setMargin(ctx, 4))
  .text("5", (ctx) => setMargin(ctx, 5))
  .row()
  .back("Back to Menu");

function setMargin(ctx: MenuContext, n: number) {
  ctx.session.qrMargin = n;
  ctx.menu.back();
  ctx.reply(`QR Code Margin is set: ${n}`);
}

qrCodeBotMenu.register(qrChooseOptionsMenu);
qrChooseOptionsMenu.register(qrChangeMarginMenu);
