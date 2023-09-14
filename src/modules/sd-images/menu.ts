import { Menu } from '@grammyjs/menu'
import { type BotContext } from '../types'
import { MenuIds, menuText } from '../../constants'
import { getStartMenuText } from '../../pages'

// export const sdImagesMenuText = {
//   helpText: `🖼️ *Stable Diffusion Help*

// *1. GENERATE A SINGLE IMAGE*
// • Use */image <PROMPTS>*
// *Example:*
// \`/image best quality, masterpiece, ultra high res, photorealistic, 1girl, offshoulder, smile\`

// *2. GENERAGE MULTIPLE IMAGES*
// • Use */images <PROMPTS>*
// *Example:*
// \`/images best quality, masterpiece, ultra high res, photorealistic, 1girl, offshoulder, smile\`

//   `,
// };

export const sdImagesMenu = new Menu<BotContext>(MenuIds.SD_IMAGES_MAIN).back(
  menuText.mainMenu.backButton,
  async (ctx) => {
    const text = (await getStartMenuText(ctx)) || ''
    ctx
      .editMessageText(text, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      })
      .catch((ex) => {
        console.log('### ex', ex)
      })
  }
)
