import { Menu } from "@grammyjs/menu";
import { BotContext } from "../types";
import { MenuIds, menuText } from "../../constants";

export const sdImagesMenuText = {
  helpText: `🖼️ *Stable Diffusion Help*

*1. GENERATE A SINGLE IMAGE*
• Use */image <PROMPTS>*
*Example:* 
\`/image best quality, masterpiece, ultra high res, photorealistic, 1girl, offshoulder, smile\`

*2. GENERAGE MULTIPLE IMAGES*
• Use */images <PROMPTS>*
*Example:* 
\`/images best quality, masterpiece, ultra high res, photorealistic, 1girl, offshoulder, smile\`

  `,
};

export const sdImagesMenu = new Menu<BotContext>(MenuIds.SD_IMAGES_MAIN).back(
  menuText.imageMenu.backButton,
  (ctx) => {
    ctx.editMessageText(menuText.imageMenu.helpText).catch((ex) => {
      console.log('### ex', ex);
    });
  }
);
