import { Menu } from '@grammyjs/menu'

import { type BotContext } from '../../types'
import { MenuIds, menuText } from '../../../constants'
import { getStartMenuText } from '../../../pages'
import { LlmModelsEnum } from '../utils/llmModelsManager'

export const chatGptMenuText = {
  helpText: `*🖌️ ChatGPT*
  

  *1. CHAT WITH AI*
  • Use */ask* <TEXT>`
}

export const chatMainMenu = new Menu<BotContext>(MenuIds.CHAT_GPT_MAIN)
  .back(menuText.mainMenu.backButton, async (ctx) => {
    const text = await getStartMenuText(ctx) || ''
    ctx
      .editMessageText(text, {
        parse_mode: 'Markdown',
        link_preview_options: { is_disabled: true }
      })
      .catch((ex) => {
        console.log('### ex', ex)
      })
  })

const chatGPTimageDefaultOptions = new Menu<BotContext>(MenuIds.CHAT_GPT_MODEL)
  // gpt-4, gpt-4-0613, gpt-4-32k, gpt-4-32k-0613, gpt-3.5-turbo, gpt-3.5-turbo-0613, gpt-3.5-turbo-16k, gpt-3.5-turbo-16k-0613
  .text(
    (ctx) => `${getLabel(LlmModelsEnum.GPT_4, ctx)}`,
    (ctx) => { setModel(LlmModelsEnum.GPT_4, ctx) }
  )
  .text(
    (ctx) => `${getLabel(LlmModelsEnum.GPT_4_32K, ctx)}`,
    (ctx) => { setModel(LlmModelsEnum.GPT_4_32K, ctx) }
  )
  .row()
  .text(
    (ctx) => `${getLabel(LlmModelsEnum.GPT_35_TURBO, ctx)}`,
    (ctx) => { setModel(LlmModelsEnum.GPT_35_TURBO, ctx) }
  )
  .row()
  .back('Back')

function getLabel (m: string, ctx: any): string {
  let label = m
  console.log(
    ctx.session.chatGpt.model,
    m,
    ctx.session.chatGpt.model === m
  )
  if (ctx.session.chatGpt.model === m) {
    label += ' ✅'
  }
  return label
}

function setModel (m: string, ctx: any): void {
  ctx.session.chatGpt.model = m
  ctx.menu.back()
}

chatMainMenu.register(chatGPTimageDefaultOptions)
