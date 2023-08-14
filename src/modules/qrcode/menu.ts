import { Menu } from "@grammyjs/menu";
import { BotContext, MenuContext } from "../types";
import { MenuIds, menuText } from "../../constants";

export const qrCodeMenuText = {
  helpText: `📷 *QR Generation* 

1. /qr <LINK> <PROMPT> - Generate Aesthetic QR Codes

\`/qr h.country/ai Dramatic bonfire on a remote beach, captured at the magic hour with flames dancing against the twilight sky; using a shallow depth of field, a fast lens, and controlled exposure to emphasize the intricate patterns and textures of the fire, complemented by embers in the wind and the gentle glow reflecting on the ocean's edge, moody, intense, and alive.
\`
`,
};

export const qrCodeBotMenu = new Menu<BotContext>(MenuIds.QR_BOT_MAIN) //<MyContext>
  // .text("Change options", async (ctx) => {
  //   await ctx.menu.nav(MenuIds.QR_BOT_CHANGE_OPTIONS);
  // })
  // .row()
  .back(menuText.mainMenu.backButton, (ctx) => {
    ctx
      .editMessageText(menuText.mainMenu.menuName, {
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      })
      .catch((ex) => {
        console.log("### ex", ex);
      });
  });

const qrChooseOptionsMenu = new Menu<BotContext>(MenuIds.QR_BOT_CHANGE_OPTIONS)
  .submenu(
    (ctx) => `QR Code Margin: ${ctx.session.qrMargin}`,
    MenuIds.QR_BOT_CHANGE_MARGIN
  )
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
