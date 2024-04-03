import {
  type OnMessageContext,
  type OnCallBackQueryData,
  type MessageExtras,
  type ChatPayload
} from '../types'
import { type ParseMode } from 'grammy/types'
import { type Message } from 'grammy/out/types'
import { type LlmCompletion, getChatModel, llmAddUrlDocument } from './api/llmApi'
import { getChatModelPrice } from '../open-ai/api/openAi'
import config from '../../config'

export enum SupportedCommands {
  bardF = 'bard',
  claudeOpus = 'claude',
  opus = 'opus',
  opusShort = 'o',
  claudeSonnet = 'claudes',
  claudeShort = 'c',
  sonnet = 'sonnet',
  sonnetShort = 's',
  claudeHaiku = 'haiku',
  haikuShort = 'h',
  bard = 'b',
  j2Ultra = 'j2-ultra',
  sum = 'sum',
  ctx = 'ctx',
  pdf = 'pdf',
  gemini = 'gemini',
  gShort = 'g'
}

export const MAX_TRIES = 3
const LLAMA_PREFIX_LIST = ['* ']
const BARD_PREFIX_LIST = ['b. ', 'B. ']
const CLAUDE_OPUS_PREFIX_LIST = ['c. ']
const GEMINI_PREFIX_LIST = ['g. ']

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

export const hasLlamaPrefix = (prompt: string): string => {
  const prefixList = LLAMA_PREFIX_LIST
  for (let i = 0; i < prefixList.length; i++) {
    if (prompt.toLocaleLowerCase().startsWith(prefixList[i])) {
      return prefixList[i]
    }
  }
  return ''
}

export const hasBardPrefix = (prompt: string): string => {
  const prefixList = BARD_PREFIX_LIST
  for (let i = 0; i < prefixList.length; i++) {
    if (prompt.toLocaleLowerCase().startsWith(prefixList[i])) {
      return prefixList[i]
    }
  }
  return ''
}

export const hasClaudeOpusPrefix = (prompt: string): string => {
  const prefixList = CLAUDE_OPUS_PREFIX_LIST
  for (let i = 0; i < prefixList.length; i++) {
    if (prompt.toLocaleLowerCase().startsWith(prefixList[i])) {
      return prefixList[i]
    }
  }
  return ''
}

export const hasGeminiPrefix = (prompt: string): string => {
  const prefixList = GEMINI_PREFIX_LIST
  for (let i = 0; i < prefixList.length; i++) {
    if (prompt.toLocaleLowerCase().startsWith(prefixList[i])) {
      return prefixList[i]
    }
  }
  return ''
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
}

export const getMessageExtras = (params: GetMessagesExtras): MessageExtras => {
  const { parseMode, caption, replyId } = params
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
    hasBardPrefix(prompt) || hasLlamaPrefix(prompt) || hasClaudeOpusPrefix(prompt) || hasGeminiPrefix(prompt)
  )
}

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

export const limitPrompt = (prompt: string): string => {
  // const wordCountPattern = /(\d+)\s*word(s)?/g
  // const match = wordCountPattern.exec(prompt)

  // if (match) {
  //   return `${prompt}`
  // }
  // return `${prompt} in around ${config.openAi.chatGpt.wordLimit} words`
  return prompt
}

export function extractPdfFilename (url: string): string | null {
  const matches = url.match(/\/([^/]+\.pdf)$/)
  if (matches) {
    return matches[1]
  } else {
    return null
  }
}

export async function addUrlToCollection (ctx: OnMessageContext | OnCallBackQueryData, chatId: number, url: string, prompt: string): Promise<void> {
  const collectionName = await llmAddUrlDocument({
    chatId,
    url
  })
  const msgId = (await ctx.reply('...', {
    message_thread_id:
      ctx.message?.message_thread_id ??
      ctx.message?.reply_to_message?.message_thread_id
  })).message_id

  ctx.session.collections.collectionRequestQueue.push({
    collectionName,
    collectionType: 'URL',
    url: url.toLocaleLowerCase(),
    prompt,
    msgId,
    processingTime: 0
  })
}

export async function addDocToCollection (ctx: OnMessageContext | OnCallBackQueryData, chatId: number, fileName: string, url: string, prompt: string): Promise<void> {
  const collectionName = await llmAddUrlDocument({
    chatId,
    url,
    fileName
  })
  const msgId = (await ctx.reply('...', {
    message_thread_id:
      ctx.message?.message_thread_id ??
      ctx.message?.reply_to_message?.message_thread_id
  })).message_id
  ctx.session.collections.collectionRequestQueue.push({
    collectionName,
    collectionType: 'PDF',
    fileName,
    url: url.toLocaleLowerCase(),
    prompt,
    msgId,
    processingTime: 0
  })
}

export const getMinBalance = async (ctx: OnMessageContext | OnCallBackQueryData,
  model: string): Promise<number> => {
  const minBalance = getPromptPrice({
    inputTokens: 400,
    outputTokens: 800,
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
