import { Menu } from '@grammyjs/menu'

import { type BotContext } from '../../types'
import { MenuIds, menuText } from '../../../constants'

export const onCountryMenuText = {
  helpText: `🌐 *1.country Help*

*1. ASSESS A DOMAIN'S STATUS*
• Use */check* <DOMAIN>

\`/check abcwebsite\`

*2. RENT A DOMAIN FOR 30 DAYS*
• Use */rent* <DOMAIN>

\`/rent abcwebsite\`

*3. RENEW A DOMAIN FOR 30 DAYS*
• Use */renew* <DOMAIN>

\`/renew abcwebsite\`
`
}

// /check [domain] - Check a 1.country domain status
// /cert [domain] - Check domain's cert status
// /nft [domain] - Check domain's nft metadata status

export const oneCountryMainMenu = new Menu<BotContext>(MenuIds.ONE_COUNTRY_MAIN) // <MyContext>
  .url('Go to 1.country', 'https://1.country')
  .row()
  .back(menuText.mainMenu.backButton, (ctx) => {
    ctx.editMessageText(menuText.mainMenu.menuName).catch((ex) => {
      console.log('### ex', ex)
    })
  })
