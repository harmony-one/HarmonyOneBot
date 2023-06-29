import {Context, SessionFlavor} from "grammy";

export interface BotSessionData {
  qrMargin: number
}

export type BotContext = Context & SessionFlavor<BotSessionData>;

