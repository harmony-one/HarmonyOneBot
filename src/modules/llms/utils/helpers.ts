import { type InlineKeyboardMarkup, type ParseMode } from 'grammy/types'
import { type Message } from 'grammy/out/types'

import {
  type OnMessageContext,
  type OnCallBackQueryData,
  type MessageExtras,
  type ChatPayload
} from '../../types'
import { type LlmCompletion, getChatModel } from '../api/llmApi'
import { getChatModelPrice } from '../api/llmApi'
import { childrenWords, sexWords } from '../../sd-images/words-blacklist'

import config from '../../../config'

export const PRICE_ADJUSTMENT = config.openAi.chatGpt.priceAdjustment

export enum SupportedCommands {
  bardF = 'bard',
  claudeOpus = 'claude',
  opus = 'opus',
  opusShort = 'o',
  claudeSonnet = 'claudes',
  claudeShortTools = 'ctool',
  claudeShort = 'c',
  sonnet = 'sonnet',
  sonnetTools = 'sonnett',
  sonnetShorTools = 'stool',
  sonnetShort = 's',
  claudeHaiku = 'haiku',
  haikuShort = 'h',
  bard = 'b',
  j2Ultra = 'j2-ultra',
  sum = 'sum',
  ctx = 'ctx',
  pdf = 'pdf',
  gemini = 'gemini',
  gShort = 'g',
  gemini15 = 'gemini15',
  g15short = 'g15',
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
  // genImgEn = 'genImgEn',
  on = 'on',
  off = 'off',
  talk = 'talk'
}

export const MAX_TRIES = 3
const LLAMA_PREFIX_LIST = ['* ']
const BARD_PREFIX_LIST = ['b. ', 'B. ']
const CLAUDE_OPUS_PREFIX_LIST = ['c. ']
const GEMINI_PREFIX_LIST = ['g. ']
const DALLE_PREFIX_LIST = ['i. ', ', ', 'd. ']
const CHAT_GPT_PREFIX_LIST = ['a. ', '. ']
const NEW_PREFIX_LIST = ['n. ', '.. ']

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

export const getMsgEntities = (ctx: OnMessageContext | OnCallBackQueryData, filter: string): string[] | undefined => {
  const msgEntities = ctx.message?.entities?.filter(e => e.type === filter)
  const msg = ctx.message?.text
  if (msgEntities && msgEntities?.length > 0 && msg) {
    return msgEntities.map(e => msg.slice(e.offset, e.offset + e.length))
  }
  const replyEntities = ctx.update.message?.reply_to_message?.entities?.filter(e => e.type === filter)
  const reply = ctx.message?.reply_to_message?.text
  if (replyEntities && replyEntities?.length > 0 && reply) {
    return replyEntities.map(e => reply.slice(e.offset, e.offset + e.length))
  }
  return undefined
}

export const getUrlFromText = (ctx: OnMessageContext | OnCallBackQueryData): string[] | undefined => {
  const entities = getMsgEntities(ctx, 'url')
  return entities
}

export const promptHasBadWords = (prompt: string): boolean => {
  const lowerCasePrompt = prompt.toLowerCase()

  const hasChildrenWords = childrenWords.some(
    word => lowerCasePrompt.includes(word.toLowerCase())
  )

  const hasSexWords = sexWords.some(
    word => lowerCasePrompt.includes(word.toLowerCase())
  )

  // const hasTabooWords = tabooWords.some(
  //     word => lowerCasePrompt.includes(word.toLowerCase())
  // );

  return hasChildrenWords && hasSexWords
}

const hasCommandPrefix = (prompt: string, prefixList: string[]): string => {
  for (let i = 0; i < prefixList.length; i++) {
    if (prompt.toLocaleLowerCase().startsWith(prefixList[i])) {
      return prefixList[i]
    }
  }
  return ''
}
export const hasLlamaPrefix = (prompt: string): string => {
  return hasCommandPrefix(prompt, LLAMA_PREFIX_LIST)
}

export const hasBardPrefix = (prompt: string): string => {
  return hasCommandPrefix(prompt, BARD_PREFIX_LIST)
}

export const hasClaudeOpusPrefix = (prompt: string): string => {
  return hasCommandPrefix(prompt, CLAUDE_OPUS_PREFIX_LIST)
}

export const hasGeminiPrefix = (prompt: string): string => {
  return hasCommandPrefix(prompt, GEMINI_PREFIX_LIST)
}

export const hasChatPrefix = (prompt: string): string => {
  return hasCommandPrefix(prompt, CHAT_GPT_PREFIX_LIST)
}

export const hasDallePrefix = (prompt: string): string => {
  return hasCommandPrefix(prompt, DALLE_PREFIX_LIST)
}

export const hasNewPrefix = (prompt: string): string => {
  return hasCommandPrefix(prompt, NEW_PREFIX_LIST)
}

export const hasUrl = (
  ctx: OnMessageContext | OnCallBackQueryData,
  prompt: string
): { newPrompt: string, url: string } => {
  const urls = ctx.entities('url')
  let url = ''
  let newPrompt = ''
  if (urls.length > 0) {
    const { text } = urls[0]
    url = text
    newPrompt = prompt.replace(url, '')
    return {
      url,
      newPrompt
    }
  }
  return {
    url,
    newPrompt: prompt
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

export const isValidUrl = (url: string): boolean => {
  const urlRegex =
  /^(https?:\/\/)?([\w.-]+\.[a-zA-Z]{2,}|[\w.-]+\.[a-zA-Z]{1,3}\.[a-zA-Z]{1,3})(\/\S*)?$/
  return urlRegex.test(url)
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
  link_preview_options?: { is_disabled: boolean }
}

export const getMessageExtras = (params: GetMessagesExtras): MessageExtras => {
  const { parseMode, caption, replyId, link_preview_options: disableWebPagePreview } = params
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
    extras.link_preview_options = disableWebPagePreview
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

// export const hasPrefix = (prompt: string): string => {
//   return (
//     hasBardPrefix(prompt) || hasLlamaPrefix(prompt) || hasClaudeOpusPrefix(prompt) || hasGeminiPrefix(prompt)
//   )
// }

export const getPromptPrice = (completion: LlmCompletion, data: ChatPayload, updateSession = true): { price: number, promptTokens: number, completionTokens: number } => {
  const { ctx, model } = data
  const modelPrice = getChatModel(model)
  const price =
    getChatModelPrice(modelPrice, true, completion.inputTokens ?? 0, completion.outputTokens ?? 0) *
    config.openAi.chatGpt.priceAdjustment
  if (updateSession) {
    ctx.session.llms.usage += completion.outputTokens ?? 0
    ctx.session.llms.price += price
  }
  return {
    price,
    promptTokens: completion.inputTokens ?? 0,
    completionTokens: completion.outputTokens ?? 0
  }
}

export function extractPdfFilename (url: string): string | null {
  const matches = url.match(/\/([^/]+\.pdf)$/)
  if (matches) {
    return matches[1]
  } else {
    return null
  }
}

export const getMinBalance = async (ctx: OnMessageContext | OnCallBackQueryData,
  model: string): Promise<number> => {
  const minBalance = getPromptPrice({
    inputTokens: 400,
    outputTokens: 400,
    completion: undefined,
    usage: 0,
    price: 0
  }, {
    ctx,
    model: model ?? '',
    conversation: []
  }, false)
  return minBalance.price
}

export const hasCodeSnippet = (ctx: OnMessageContext | OnCallBackQueryData): boolean => {
  const entities = ctx.entities('pre') // pre => code snippets
  return entities.length > 0
}
