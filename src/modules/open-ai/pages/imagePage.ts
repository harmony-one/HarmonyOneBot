import { Menu } from '@grammyjs/menu'

import { appText } from '../utils/text'
import { type BotContext } from '../../types'
import { isAdmin } from '../utils/context'
import { MenuIds, menuText } from '../../../constants'
import config from '../../../config'

export const openAiMenuText = {
  helpText: `*🎨 DALL·E 2 Help*

  I generate *${config.openAi.imageGen.sessionDefault.numImages} ${config.openAi.imageGen.sessionDefault.imgSize}* image(s) per prompt\n
  
  *1. GENERATE A STANDARD PROMPT*
  • Use */genImg* <TEXT>
  Example: 
  \`/genImg beautiful scenery, purple galaxy bottle\`
  
  *2. GENERATE AN ENHANCED IMAGE*
  • Use */genImgEn* <TEXT>
  Example: 
  \`/genImgEn beautiful scenery, horse trotting\`
  
  `
}

// `*3. GENERATE IMAGE VARIATIONS*
// To generates variations of an image using OpenAi API, reply to a message in our chat
// with a picture and write the number of variations (max 10). Also, you can upload a
// photo and write the number of variations in the caption.
// ``,

export const imageGenMainMenu = new Menu<BotContext>(MenuIds.IMAGE_GEN_MAIN)
  .text(
    (ctx) =>
      `${
        ctx.session.openAi.imageGen.isEnabled
          ? '🔴 Disable bot'
          : '🟢 Enable bot'
      }`,
    async (ctx) => {
      if (await isAdmin(ctx)) {
        ctx.session.openAi.imageGen.isEnabled =
          !ctx.session.openAi.imageGen.isEnabled
        ctx.menu.update()
      } else {
        ctx
          .editMessageText('Only the group owner can enable/disable this bot', {
            parse_mode: 'Markdown',
            disable_web_page_preview: true
          })
          .catch((ex: any) => { console.log('### ex', ex) })
      }
    }
  )
  .row()
  .text('Change default values', async (ctx) => {
    if (await isAdmin(ctx)) {
      ctx
        .editMessageText(appText.imageGenChangeDefault, {
          parse_mode: 'Markdown',
          reply_markup: imageDefaultOptions
        })
        .catch((ex: any) => {
          console.log('### ex', ex)
        })
    } else {
      ctx
        .editMessageText(
          'Only the group owner can change OpenAI configuration',
          {
            parse_mode: 'Markdown',
            disable_web_page_preview: true
          }
        )
        .catch((ex: any) => { console.log('### ex', ex) })
    }
  })
  .row()
  .back(menuText.imageMenu.backButton, (ctx) => {
    ctx.editMessageText(menuText.imageMenu.helpText, { parse_mode: 'Markdown' }).catch((ex) => {
      console.log('### ex', ex)
    })
  })

const imageDefaultOptions = new Menu<BotContext>(MenuIds.IMAGE_GEN_OPTIONS)
  .submenu('Change the image number', MenuIds.IMAGE_GEN_NUMBER)
  .row()
  .submenu('Change the image size', MenuIds.IMAGE_GEN_SIZE)
  .row()
  .back('Back')

const imageGenNumberOptions = new Menu<BotContext>(MenuIds.IMAGE_GEN_NUMBER)
  .text(
    (ctx) => `${getLabel('1', 'numImages', ctx)}`,
    (ctx) => { setImageNumber(1, ctx) }
  )
  .text(
    (ctx) => `${getLabel('2', 'numImages', ctx)}`,
    (ctx) => { setImageNumber(2, ctx) }
  )
  .text(
    (ctx) => `${getLabel('3', 'numImages', ctx)}`,
    (ctx) => { setImageNumber(3, ctx) }
  )
  .row()
  .text(
    (ctx) => `${getLabel('4', 'numImages', ctx)}`,
    (ctx) => { setImageNumber(4, ctx) }
  )
  .text(
    (ctx) => `${getLabel('5', 'numImages', ctx)}`,
    (ctx) => { setImageNumber(5, ctx) }
  )
  .text(
    (ctx) => `${getLabel('6', 'numImages', ctx)}`,
    (ctx) => { setImageNumber(6, ctx) }
  )
  .row()
  .text(
    (ctx) => `${getLabel('7', 'numImages', ctx)}`,
    (ctx) => { setImageNumber(7, ctx) }
  )
  .text(
    (ctx) => `${getLabel('8', 'numImages', ctx)}`,
    (ctx) => { setImageNumber(8, ctx) }
  )
  .text(
    (ctx) => `${getLabel('9', 'numImages', ctx)}`,
    (ctx) => { setImageNumber(9, ctx) }
  )
  .row()
  .back('Back')

function getLabel (m: string, attribute: string, ctx: any): string {
  let label = m
  if (ctx.session.openAi.imageGen[attribute] + '' === m) {
    label += ' ✅'
  }
  return label
}

const imageGenSizeOptions = new Menu<BotContext>(MenuIds.IMAGE_GEN_SIZE)
  .text(
    (ctx) => `${getLabel('256x256', 'imgSize', ctx)}`,
    (ctx) => { setImageSize('256x256', ctx) }
  )
  .text(
    (ctx) => `${getLabel('512x512', 'imgSize', ctx)}`,
    (ctx) => { setImageSize('512x512', ctx) }
  )
  .text(
    (ctx) => `${getLabel('1024x1024', 'imgSize', ctx)}`,
    (ctx) => { setImageSize('1024x1024', ctx) }
  )
  .row()
  .back('⬅️ Back')

function setImageNumber (n: number, ctx: any): void {
  ctx.session.openAi.imageGen.numImages = n
  ctx.menu.back()
}

function setImageSize (s: string, ctx: any): void {
  ctx.session.openAi.imageGen.imgSize = s
  ctx.menu.back()
}

imageGenMainMenu.register(imageDefaultOptions)
imageDefaultOptions.register(imageGenNumberOptions)
imageDefaultOptions.register(imageGenSizeOptions)
