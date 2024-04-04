import { Menu } from '@grammyjs/menu'
import { type BotContext } from '../types'
import { MenuIds, menuText } from '../../constants'
import { getStartMenuText } from '../../pages'

export const voiceMemoMenuText = {
  helpText: `🎙 *Voice Memo Help*

1. CREATE A SHORT SUMMARY FROM A VOICE MESSAGE

• Send or forward a voice message (.m4a) from a private chat or group.`
}

export const voiceMemoMenu = new Menu<BotContext>(MenuIds.VOICE_MEMO_MAIN)
  .row()
  .back(menuText.mainMenu.backButton, async (ctx) => {
    const text = await getStartMenuText(ctx) || ''
    ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      link_preview_options: { is_disabled: true }
    }).catch((ex) => {
      console.log('### ex', ex)
    })
  })
