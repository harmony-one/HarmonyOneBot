import {
  type Context,
  type SessionFlavor
} from 'grammy'
import { type Filter, type FilterQuery } from 'grammy/out/filter'
import { type MenuFlavor } from '@grammyjs/menu/out/menu'
import {
  type Conversation,
  type ConversationFlavor
} from '@grammyjs/conversations'
import { type AutoChatActionFlavor } from '@grammyjs/auto-chat-action'
import { type ParseMode } from 'grammy/types'

export interface ImageGenSessionData {
  numImages: number
  imgSize: string
  isEnabled: boolean
}

export interface MessageExtras {
  caption?: string
  message_thread_id?: number
  parse_mode?: ParseMode
  reply_to_message_id?: number
  disable_web_page_preview?: boolean
}
export interface ChatCompletion {
  completion: string
  usage: number
  price: number
}
export interface ChatPayload {
  conversation: ChatConversation[]
  model: string
  ctx: OnMessageContext | OnCallBackQueryData
}
export interface ChatConversation {
  role?: string
  author?: string
  content: string
  model?: string
}
export interface ChatGptSessionData {
  model: string
  isEnabled: boolean
  chatConversation: ChatConversation[]
  usage: number
  price: number
  requestQueue: string[]
  isProcessingQueue: boolean
}

export interface LmmsSessionData {
  model: string
  isEnabled: boolean
  chatConversation: ChatConversation[]
  usage: number
  price: number
  requestQueue: ChatConversation[]
  isProcessingQueue: boolean
}
export interface OpenAiSessionData {
  imageGen: ImageGenSessionData
  chatGpt: ChatGptSessionData
}

export interface OneCountryData {
  lastDomain: string
}

export interface TranslateBotData {
  languages: string[]
  enable: boolean
}

export interface BotSessionData {
  oneCountry: OneCountryData
  openAi: OpenAiSessionData
  translate: TranslateBotData
  llms: LmmsSessionData
}

export type BotContext = Context &
SessionFlavor<BotSessionData> &
ConversationFlavor &
AutoChatActionFlavor

export type CustomContext<Q extends FilterQuery> = Filter<BotContext, Q>
export type OnMessageContext = CustomContext<'message'>
export type OnPreCheckoutContext = CustomContext<'pre_checkout_query'>
export type OnSuccessfullPayment = CustomContext<'message:successful_payment'>
export type OnCallBackQueryData = CustomContext<'callback_query:data'>
export type MenuContext = Filter<BotContext, 'callback_query:data'> &
MenuFlavor

export type BotConversation = Conversation<BotContext>

export type RefundCallback = (reason?: string) => void
