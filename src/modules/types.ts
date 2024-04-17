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
import { type PhotoSize, type ParseMode } from 'grammy/types'
import { type InlineKeyboardMarkup } from 'grammy/out/types'
import type { FileFlavor } from '@grammyjs/files'

export interface ImageGenSessionData {
  numImages: number
  imgSize: string
  isEnabled: boolean
  isInscriptionLotteryEnabled: boolean
  imgRequestQueue: ImageRequest[]
  isProcessingQueue: boolean
  imageGenerated: ImageGenerated[]
  imgInquiried: string[] // to avoid multiple vision and dalle 2 img alter request
}
export interface MessageExtras {
  caption?: string
  message_thread_id?: number
  parse_mode?: ParseMode
  reply_to_message_id?: number
  // disable_web_page_preview?: boolean
  reply_markup?: InlineKeyboardMarkup
  link_preview_options?: { is_disabled: boolean }
}
export interface ChatCompletion {
  completion: string
  usage: number
  price: number
}
export interface ChatPayload {
  conversation: ChatConversation[]
  prompt?: string
  model: string
  ctx: OnMessageContext | OnCallBackQueryData
}

export interface VisionContent {
  type: string
  text?: string
  image_url?: { url: string }
}
export interface ChatConversation {
  id?: number
  role?: string
  author?: string
  content: string | VisionContent[]
  model?: string
  numSubAgents?: number
}

export interface ImageRequest {
  command?: 'dalle' | 'alter' | 'vision'
  prompt?: string
  photo?: PhotoSize[] | undefined
  photoUrl?: string[]
}

export interface ImageGenerated {
  command?: 'dalle' | 'alter' | 'vision'
  prompt?: string
  photo?: PhotoSize[] | undefined
  photoUrl?: string[]
  photoId?: string | undefined
}

export interface promptRequest {
  prompt: string
  msgId?: number
  outputFormat?: 'text' | 'voice'
  commandPrefix?: string
}

export interface LlmsSessionData {
  model: string
  isEnabled: boolean
  isFreePromptChatGroups?: boolean
  chatConversation: ChatConversation[]
  usage: number
  price: number
  requestQueue: ChatConversation[]
  isProcessingQueue: boolean
}

export interface OneCountryData {
  lastDomain: string
}

export interface TranslateBotData {
  languages: string[]
  enable: boolean
}

export enum RequestState {
  Initial = 'initial',
  Error = 'error',
  Success = 'success'
}

export interface Collection {
  collectionName: string
  collectionType: 'URL' | 'PDF'
  url: string
  fileName?: string
  prompt?: string
  msgId?: number
  processingTime?: number // milliseconds
  agentId?: number
}

export interface FileDoc {
  fileName: string
  fileType: string
  fileSize: number
}
export interface CollectionSessionData {
  activeCollections: Collection[]
  collectionRequestQueue: Collection[]
  isProcessingQueue: boolean
  currentCollection: string
  collectionConversation: ChatConversation[]
}
export interface Analytics {
  firstResponseTime: bigint
  actualResponseTime: bigint
  sessionState: RequestState
  module: string
}

export interface PaymentAnalytics {
  paymentTotal: number
  paymentFreeCredits: number
  paymentOneCredits: number
  paymentFiatCredits: number
}

export enum SubagentStatus {
  NO_SUPPORTED_EVENT = 'NO_SUPORTED_EVENT',
  PROCESSING = 'PROCESSING',
  DONE = 'DONE',
  ERROR = 'ERROR'
}
export interface SubagentResult {
  id: number
  name: string
  completion: string
  status: SubagentStatus
}

export interface SubagentSessionData {
  running: SubagentResult[]
  isProcessingQueue: boolean
  subagentsRequestQueue: SubagentResult[]
}
export interface BotSessionData {
  oneCountry: OneCountryData
  collections: CollectionSessionData
  translate: TranslateBotData
  llms: LlmsSessionData
  chatGpt: LlmsSessionData
  subagents: SubagentSessionData
  dalle: ImageGenSessionData
}

export interface TransientStateContext {
  transient: {
    analytics: Analytics
    refunded: boolean
    payment: PaymentAnalytics
  }
}

export type BotContext = FileFlavor<Context &
SessionFlavor<BotSessionData> &
ConversationFlavor &
AutoChatActionFlavor &
TransientStateContext>

export type CustomContext<Q extends FilterQuery> = Filter<BotContext, Q>
export type OnMessageContext = CustomContext<'message'>
export type OnPreCheckoutContext = CustomContext<'pre_checkout_query'>
export type OnSuccessfullPayment = CustomContext<'message:successful_payment'>
export type OnCallBackQueryData = CustomContext<'callback_query:data'>
export type MenuContext = Filter<BotContext, 'callback_query:data'> &
MenuFlavor

export type BotConversation = Conversation<BotContext>

export type RefundCallback = (reason?: string) => void

export interface PayableBot {
  getEstimatedPrice: (ctx: OnMessageContext) => number
  isSupportedEvent: (ctx: OnMessageContext) => boolean
  onEvent: (ctx: OnMessageContext, refundCallback: RefundCallback) => Promise<any>
}
export interface UtilityBot {
  isSupportedEvent: (ctx: OnMessageContext) => boolean
  onEvent: (ctx: OnMessageContext) => Promise<any>
}
export interface PayableBotConfig {
  bot: PayableBot
  enabled?: (ctx: OnMessageContext) => boolean
}

export enum Callbacks {
  CreditsFiatBuy = 'credits-fiat-buy'
}
