import {Context, SessionFlavor} from "grammy";
import {Filter} from "grammy/out/filter";

export interface BotSessionData {
  qrMargin: number
}

export type BotContext = Context & SessionFlavor<BotSessionData>;

export type OnMessageContext = Filter<BotContext, 'message'>