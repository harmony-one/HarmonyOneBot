import { Menu } from "@grammyjs/menu";
import { BotContext } from "../types";
import { MenuIds } from "../../constants";

const helpText = `🖼️ *Stable Diffusion Help*

*Commands*

Send a message with the "/image" command and your prompts:
/image *PROMPTS*.

*Example:*

\`/image best quality, masterpiece, ultra high res, photorealistic, 1girl, offshoulder, smile\`

Also, you can generate multiple images at once and then choose the best one.

Send a message with the "/images" command and your prompts:

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
