
import { Context, SessionFlavor } from "grammy";
import { Filter, FilterQuery } from "grammy/out/filter";
import { MenuFlavor } from "@grammyjs/menu/out/menu";
import {
  type Conversation,
  type ConversationFlavor,
} from "@grammyjs/conversations";
export interface ImageGenSessionData {
  numImages: number;
  imgSize: string;
  isEnabled: boolean;
}

export interface ChatCompletion {
  completion: string
  usage: number
  price: number
}
export interface ChatConversation {
  role: string;
  content: string;
}
export interface ChatGptSessionData {
  model: string;
  isEnabled: boolean;
  chatConversation: ChatConversation[];
  usage: number;
  price: number;
}
export interface OpenAiSessionData {
  imageGen: ImageGenSessionData;
  chatGpt: ChatGptSessionData;
}

export interface OneCountryData {
  lastDomain: string;
}
export interface BotSessionData {
  oneCountry: OneCountryData;
  qrMargin: number;
  openAi: OpenAiSessionData;
}

export type BotContext = Context &
  SessionFlavor<BotSessionData> &
  ConversationFlavor;

export type CustomContext<Q extends FilterQuery> = Filter<BotContext, Q>;
export type OnMessageContext = CustomContext<"message">;
export type OnCallBackQueryData = CustomContext<"callback_query:data">;
export type MenuContext = Filter<BotContext, "callback_query:data"> &
  MenuFlavor;

export type BotConversation = Conversation<BotContext>;

export type RefundCallback = (reason?: string) => void
