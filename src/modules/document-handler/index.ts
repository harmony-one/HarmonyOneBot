import {OnMessageContext, RefundCallback} from "../types";
import pino, {Logger} from "pino";
import {chatCompletion, getChatModel, getChatModelPrice, getTokenNumber} from "../open-ai/api/openAi";
import config from "../../config";

const SupportedDocuments = {
  PDF: 'application/pdf',
}

export class DocumentHandler {

  public async onEvent(ctx: OnMessageContext, refundCallback: RefundCallback) {

    try{
      const file = await ctx.getFile()
      console.log(file);
      await ctx.reply("you did it kid");
    } catch(error) {
      console.error('Error:', error);
      await ctx.reply("you failed kid");
    }
  }

  public isSupportedEvent(ctx: OnMessageContext): boolean {
    let documentType = ctx.message.document?.mime_type;

    if(documentType !== undefined) {
      return Object.values(SupportedDocuments).includes(documentType);
    }

    return false;

  }
}