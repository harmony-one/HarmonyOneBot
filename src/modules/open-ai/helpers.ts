import config from '../../config'
import { type OnMessageContext, type OnCallBackQueryData, type MessageExtras, type ChatPayload } from '../types'
import { type ParseMode } from 'grammy/types'
import { getChatModel, getChatModelPrice, getTokenNumber } from './api/openAi'
import { type Message, type InlineKeyboardMarkup } from 'grammy/out/types'
import { isValidUrl } from './utils/web-crawler'

export enum SupportedCommands {
  chat = 'chat',
  ask = 'ask',
  vision = 'vision',
  ask35 = 'ask35',
  new = 'new',
  gpt4 = 'gpt4',
  ask32 = 'ask32',
  gpt = 'gpt',
  last = 'last',
  dalle = 'dalle',
  dalleImg = 'image',
  dalleShort = 'img',
  dalleShorter = 'i',
  genImgEn = 'genImgEn',
  on = 'on',
  off = 'off',
  talk = 'talk'
}

export const MAX_TRIES = 3

export const DALLE_PREFIX_LIST = ['i.', ', ', 'd.']
export const CHAT_GPT_PREFIX_LIST = ['a.', '. ']
export const NEW_PREFIX_LIST = ['n.', '.. ']

export const isMentioned = (
  ctx: OnMessageContext | OnCallBackQueryData
): boolean => {
  if (ctx.entities()[0]) {
    const { offset, text } = ctx.entities()[0]
    const { username } = ctx.me
    if (username === text.slice(1) && offset === 0) {
      const prompt = ctx.message?.text?.slice(text.length)
      if (prompt && prompt.split(' ').length > 0) {
        return true
      }
    }
  }
  return false
}

export const hasChatPrefix = (prompt: string): string => {
  const prefixList = CHAT_GPT_PREFIX_LIST
  for (let i = 0; i < prefixList.length; i++) {
    if (prompt.toLocaleLowerCase().startsWith(prefixList[i])) {
      return prefixList[i]
    }
  }
  return ''
}

export const hasDallePrefix = (prompt: string): string => {
  const prefixList = DALLE_PREFIX_LIST
  for (let i = 0; i < prefixList.length; i++) {
    if (prompt.toLocaleLowerCase().startsWith(prefixList[i])) {
      return prefixList[i]
    }
  }
  return ''
}

export const hasNewPrefix = (prompt: string): string => {
  const prefixList = NEW_PREFIX_LIST
  for (let i = 0; i < prefixList.length; i++) {
    if (prompt.toLocaleLowerCase().startsWith(prefixList[i])) {
      return prefixList[i]
    }
  }
  return ''
}

const hasUrlPrompt = (prompt: string): string => {
  const promptArray = prompt.split(' ')
  let url = ''
  for (let i = 0; i < promptArray.length; i++) {
    if (isValidUrl(promptArray[i])) {
      url = promptArray[i]
      promptArray.splice(i, 1)
      break
    }
  }
  return url
}

export const hasCodeSnippet = (ctx: OnMessageContext | OnCallBackQueryData): boolean => {
  const entities = ctx.entities('pre') // pre => code snippets
  return entities.length > 0
}

export const hasUrl = (
  ctx: OnMessageContext | OnCallBackQueryData,
  prompt: string
): { newPrompt: string, url: string } => {
  const urls = ctx.entities('url')
  let url = ''
  let newPrompt = prompt
  if (urls.length > 0) {
    const { text } = urls[0]
    url = text
    newPrompt = prompt.replace(url, ' this context ')
  } else {
    url = hasUrlPrompt(prompt)
    if (url) {
      newPrompt = prompt.replace(url, ' this context ')
    }
  }
  return {
    url,
    newPrompt
  }
}

export const hasUsernamePassword = (prompt: string): { password: string, user: string } => {
  let user = ''
  let password = ''
  const parts = prompt.split(' ')

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].toLowerCase()
    if (part.includes('=')) {
      const [keyword, value] = parts[i].split('=')
      if (keyword === 'user' || keyword === 'username') {
        user = value
      } else if (keyword === 'password' || keyword === 'pwd') {
        password = value
      }
      if (user !== '' && password !== '') {
        break
      }
    } else if (part === 'user') {
      user = parts[i + 1]
    } else if (part === 'password') {
      password = parts[i + 1]
    }
  }
  return { user, password }
}

// doesn't get all the special characters like !
export const hasUserPasswordRegex = (prompt: string): { password: string, user: string } => {
  const pattern =
    /\b(user=|password=|user|password)\s*([^\s]+)\b.*\b(user=|password=|user|password)\s*([^\s]+)\b/i
  const matches = pattern.exec(prompt)

  let user = ''
  let password = ''

  if (matches) {
    const [, keyword, word, , word2] = matches
    if (keyword.toLowerCase() === 'user' || keyword.toLowerCase() === 'user=') {
      user = word
      password = word2
    } else if (
      keyword.toLowerCase() === 'password' ||
      keyword.toLowerCase() === 'password='
    ) {
      password = word
      user = word2
    }
  }
  return { user, password }
}

export const preparePrompt = async (
  ctx: OnMessageContext | OnCallBackQueryData,
  prompt: string
): Promise<string> => {
  const msg = ctx.message?.reply_to_message?.text
  if (msg) {
    return `${prompt} ${msg}`
  }
  return prompt
}

export const messageTopic = async (
  ctx: OnMessageContext | OnCallBackQueryData
): Promise<undefined | number> => {
  return ctx.message?.message_thread_id
}

interface GetMessagesExtras {
  parseMode?: ParseMode | undefined
  caption?: string | undefined
  replyId?: number | undefined
  reply_markup?: InlineKeyboardMarkup
  disable_web_page_preview?: boolean
}

export const getMessageExtras = (params: GetMessagesExtras): MessageExtras => {
  const { parseMode, caption, replyId, disable_web_page_preview: disableWebPagePreview } = params
  const extras: MessageExtras = {}
  if (parseMode) {
    extras.parse_mode = parseMode
  }
  if (replyId) {
    extras.reply_to_message_id = replyId
  }
  if (caption) {
    extras.caption = caption
  }
  if (disableWebPagePreview) {
    extras.disable_web_page_preview = disableWebPagePreview
  }
  if (params.reply_markup) {
    extras.reply_markup = params.reply_markup
  }
  return extras
}

export const sendMessage = async (
  ctx: OnMessageContext | OnCallBackQueryData,
  msg: string,
  msgExtras?: GetMessagesExtras
): Promise<Message.TextMessage> => {
  let extras: MessageExtras = {}
  if (msgExtras) {
    extras = getMessageExtras(msgExtras)
  }
  const topicId = ctx.message?.message_thread_id

  if (topicId) {
    extras.message_thread_id = topicId
  }

  return await ctx.reply(msg, extras)
}

export const hasPrefix = (prompt: string): string => {
  return (
    hasChatPrefix(prompt) || hasDallePrefix(prompt) || hasNewPrefix(prompt)
  )
}

export const getPromptPrice = (completion: string, data: ChatPayload): { price: number, promptTokens: number, completionTokens: number, totalTokens: number } => {
  const { conversation, ctx, model } = data
  const currentUsage = data.prompt ? 0 : ctx.session.openAi.chatGpt.usage
  const prompt = data.prompt ? data.prompt : conversation[conversation.length - 1].content
  const promptTokens = getTokenNumber(prompt as string) + currentUsage
  const completionTokens = getTokenNumber(completion)
  const modelPrice = getChatModel(model)
  const price =
    getChatModelPrice(modelPrice, true, promptTokens, completionTokens) *
    config.openAi.chatGpt.priceAdjustment
  conversation.push({ content: completion, role: 'system' })
  ctx.session.openAi.chatGpt.usage += completionTokens
  ctx.session.openAi.chatGpt.price += price
  return {
    price,
    promptTokens,
    completionTokens,
    totalTokens: data.prompt ? promptTokens + completionTokens : ctx.session.openAi.chatGpt.usage
  }
}

export const limitPrompt = (prompt: string): string => {
  const wordCountPattern = /(\d+)\s*word(s)?/g
  const match = wordCountPattern.exec(prompt)

  if (match) {
    return `${prompt}`
  }

  return `${prompt} in around ${config.openAi.chatGpt.wordLimit} words`
}

export const getUrlFromText = (ctx: OnMessageContext | OnCallBackQueryData): string[] | undefined => {
  const entities = ctx.message?.entities ? ctx.message?.entities : ctx.message?.reply_to_message?.entities
  const text = ctx.message?.text ? ctx.message?.text : ctx.message?.reply_to_message?.text
  if (entities && text) {
    const urlEntity = entities.filter(e => e.type === 'url')
    if (urlEntity.length > 0) {
      const urls = urlEntity.map(e => text.slice(e.offset, e.offset + e.length))
      return urls
    }
  }
  return undefined
}

// export async function addUrlToCollection (ctx: OnMessageContext | OnCallBackQueryData, chatId: number, url: string, prompt: string): Promise<void> {
//   const collectionName = await llmAddUrlDocument({
//     chatId,
//     url
//   })
//   const msgId = (await ctx.reply('...', {
//     message_thread_id:
//     ctx.message?.message_thread_id ??
//     ctx.message?.reply_to_message?.message_thread_id
//   })).message_id

//   ctx.session.collections.collectionRequestQueue.push({
//     collectionName,
//     collectionType: 'URL',
//     url,
//     prompt,
//     msgId
//   })
// }
