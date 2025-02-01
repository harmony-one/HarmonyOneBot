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
import { type ParseDate } from './types'

export const PRICE_ADJUSTMENT = config.openAi.chatGpt.priceAdjustment

export enum SupportedCommands {
  c0 = 'c0',
  sum = 'sum',
  ctx = 'ctx',
  pdf = 'pdf',
  last = 'last',
  on = 'on',
  off = 'off',
  talk = 'talk'
}

export const MAX_TRIES = 3

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
  // )

  return hasChildrenWords && hasSexWords
}

export const hasCommandPrefix = (prompt: string, prefixList: string[]): string => {
  for (let i = 0; i < prefixList.length; i++) {
    if (prompt.toLocaleLowerCase().startsWith(prefixList[i])) {
      return prefixList[i]
    }
  }
  return ''
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

export function isValidDate (date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime())
}

export function parseDate (date: Date): ParseDate | null {
  if (!isValidDate(date)) {
    return null
  }
  const month = date.getMonth() + 1 // getMonth() returns 0-11
  const year = date.getFullYear()
  const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(date)

  return { month, year, monthName }
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
  const price = modelPrice
    ? getChatModelPrice(modelPrice, true, completion.inputTokens ?? 0, completion.outputTokens ?? 0) *
    config.openAi.chatGpt.priceAdjustment
    : 0
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

// Find all Markdown entities and their positions
export const splitTelegramMessage = (text: string): string[] => {
  const maxLength = 4096
  const result: string[] = []

  // Regex to match start of Markdown entities
  const entityStartPatterns = [
    /\*/g, // bold text (single asterisk)
    /_/g, // italic text (single underscore)
    /```/g, // pre-formatted code block (triple backtick)
    /`/g, // inline fixed-width code (single backtick)
    /\[/g // inline URL or user mention
  ]

  // Function to find the last safe split position
  const findSafeSplitPosition = (text: string, endIndex: number): number => {
    // First try to find the last space before endIndex
    const lastSpace = text.lastIndexOf(' ', endIndex)
    if (lastSpace === -1) return endIndex

    // Check for any entity starts between lastSpace and endIndex
    const textSegment = text.slice(0, lastSpace)

    for (const pattern of entityStartPatterns) {
      pattern.lastIndex = 0 // Reset regex state
      const matches = [...textSegment.matchAll(pattern)]
      if (matches.length % 2 === 1) {
        // If we have an odd number of entity markers, find the last one
        const lastEntityStart = matches[matches.length - 1].index
        // Return position just after the last complete entity
        return lastEntityStart
      }
    }

    return lastSpace
  }

  let startIndex = 0
  while (startIndex < text.length) {
    let endIndex = Math.min(startIndex + maxLength, text.length)
    if (endIndex < text.length) {
      endIndex = findSafeSplitPosition(text.slice(startIndex, endIndex), maxLength)
    }

    const chunk = text.slice(startIndex, startIndex + endIndex).trim()
    result.push(chunk)
    startIndex += endIndex
    // Skip whitespace between chunks
    while (startIndex < text.length && /\s/.test(text[startIndex])) {
      startIndex++
    }
  }
  return result
}

// export const splitTelegramMessage = (text: string): string[] => {
//   const maxLength = 4096
//   const result: string[] = []

//   // Regular expression to match Markdown entities
//   const markdownRegex = /(\*\*|__|\[.*?\]\(.*?\)|```[\s\S]*?```|`[^`\n]+`)/g

//   // Function to find the end index that avoids splitting Markdown entities
//   const findEndIndex = (startIndex: number, chunk: string): number => {
//     const matches = [...chunk.matchAll(markdownRegex)]
//     if (matches.length === 0) return startIndex + maxLength

//     const lastMatch = matches[matches.length - 1]
//     const lastMatchEnd = lastMatch.index + lastMatch[0].length
//     return lastMatchEnd > chunk.length ? startIndex + lastMatch.index : startIndex + maxLength
//   }

//   let startIndex = 0
//   while (startIndex < text.length) {
//     let endIndex = findEndIndex(startIndex, text.slice(startIndex, startIndex + maxLength))
//     endIndex = Math.min(endIndex, text.length) // Ensure endIndex is within bounds

//     // Find a natural break point if necessary
//     if (endIndex < text.length) {
//       const lastSpaceIndex = text.slice(startIndex, endIndex).lastIndexOf(' ')
//       if (lastSpaceIndex > 0) {
//         endIndex = startIndex + lastSpaceIndex
//       }
//     }

//     result.push(text.slice(startIndex, endIndex).trim())
//     startIndex = endIndex

//     // Move past any spaces or special characters that might cause issues
//     while (startIndex < text.length && /\s/.test(text[startIndex])) {
//       startIndex++
//     }
//   }

//   return result
// }
