import {Context, SessionFlavor} from "grammy";
import {Filter} from "grammy/out/filter";

export interface ImageGenSessionData {
  numImages: number;
  imgSize: string;
}

export interface BotSessionData {
  qrMargin: number,
  imageGen: ImageGenSessionData;
}

export type BotContext = Context & SessionFlavor<BotSessionData>;

export type OnMessageContext = Filter<BotContext, 'message'>