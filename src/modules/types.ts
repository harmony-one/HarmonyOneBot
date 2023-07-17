import { Context, Middleware, SessionFlavor } from "grammy";
import { Filter, FilterQuery } from "grammy/out/filter";
import { MenuFlavor } from "@grammyjs/menu/out/menu";

export interface ImageGenSessionData {
  numImages: number;
  imgSize: string;
  isEnabled: boolean;
}

export interface ChatGptSessionData {
  model: string;
  isEnabled: boolean;
}
export interface OpenAiSessionData {
  imageGen: ImageGenSessionData;
  chatGpt: ChatGptSessionData;
}

export interface ChatConversation {
  role: string;
  content: string;
}

export interface BotSessionData {
  qrMargin: number;
  openAi: OpenAiSessionData;
}

export type BotContext = Context & SessionFlavor<BotSessionData>;

export type CustomContext<Q extends FilterQuery> = Filter<BotContext, Q>;
export type OnMessageContext = CustomContext<"message">;
export type OnCallBackQueryData = CustomContext<"callback_query:data">;
export type MenuContext = Filter<BotContext, "callback_query:data"> &
  MenuFlavor;
