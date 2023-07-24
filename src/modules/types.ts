import { Context, Middleware, SessionFlavor } from "grammy";
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

export interface BotSessionData {
  qrMargin: number;
  imageGen: ImageGenSessionData;
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
