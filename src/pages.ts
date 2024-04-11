import { Menu } from '@grammyjs/menu'
import { chatMainMenu } from './modules/llms/menu/openaiMenu'
import { type BotContext } from './modules/types'
import { sdImagesMenu } from './modules/sd-images/menu'
import { voiceMemoMenu } from './modules/voice-memo/menu'
import { MenuIds, commandsHelpText, menuText } from './constants'
import { BotPayments } from './modules/payment'
import { TelegramPayments } from './modules/telegram_payment'

const payments = new BotPayments()
const telegramPayments = new TelegramPayments(payments)

export const getStartMenuText = async (ctx: BotContext): Promise<string> => {
  if (!ctx.from?.id) {
    throw new Error('Context has no user id')
  }
  const userWalletAddress = (payments.getUserAccount(ctx.from?.id)?.address) ?? ''
  const balance = await payments.getAddressBalance(userWalletAddress)
  const balanceOne = payments.toONE(balance, false).toFixed(2)
  const startText = commandsHelpText.start
    .replaceAll('$CREDITS', balanceOne + '')
    .replaceAll('$WALLET_ADDRESS', userWalletAddress)
  return startText
}

export const mainMenu = new Menu<BotContext>(MenuIds.MAIN_MENU)
  .text('💳 /buy', async (ctx) => {
    await telegramPayments.createPaymentInvoice(ctx)
  })
  .submenu(menuText.askMenu.menuName, MenuIds.CHAT_GPT_MAIN, (ctx) => {
    ctx
      .editMessageText(menuText.askMenu.helpText, {
        parse_mode: 'Markdown',
        link_preview_options: { is_disabled: true }
      })
      .catch((ex: any) => {
        console.log('### ex', ex)
      })
  })
  .submenu(menuText.imageMenu.menuName, MenuIds.SD_IMAGES_MAIN, (ctx) => {
    ctx
      .editMessageText(menuText.imageMenu.helpText, {
        parse_mode: 'Markdown',
        link_preview_options: { is_disabled: true }
      })
      .catch((ex: any) => {
        console.log('### ex', ex)
      })
  })
  .submenu(menuText.voiceMemoMenu.menuName, MenuIds.VOICE_MEMO_MAIN, (ctx) => {
    ctx
      .editMessageText(menuText.voiceMemoMenu.helpText, {
        parse_mode: 'Markdown',
        link_preview_options: { is_disabled: true }
      })
      .catch((ex: any) => {
        console.log('### ex', ex)
      })
  })

mainMenu.register(sdImagesMenu)
mainMenu.register(voiceMemoMenu)
mainMenu.register(chatMainMenu)
// mainMenu.register(qrCodeBotMenu);
// mainMenu.register(walletMenu);
