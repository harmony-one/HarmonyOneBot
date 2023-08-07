import { Menu } from "@grammyjs/menu";
import { BotContext } from "../types";
import { MenuIds } from "../../constants";

const helpText = `🖼️ *Stable Diffusion Help*

*1. GENERATE A SINGLE IMAGE*
• Use */image <PROMPTS>**
*Example:* 
\`/image best quality, masterpiece, ultra high res, photorealistic, 1girl, offshoulder, smile\`

*2. GENERAGE MULTIPLE IMAGES*
• Use */images <PROMPTS>*
*Example:* 
\`/images best quality, masterpiece, ultra high res, photorealistic, 1girl, offshoulder, smile\`

`;

export const sdImagesMenu = new Menu<BotContext>(MenuIds.SD_IMAGES_MAIN)
  .text("Help", async (ctx) => {
    await ctx.menu.close();
    ctx.reply(helpText, {
      parse_mode: "Markdown",
      reply_markup: sdImagesMenu,
      disable_web_page_preview: true,
    });
  })
  .row()
  .back("⬅️ Back");
