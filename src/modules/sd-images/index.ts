import { InlineKeyboard, InputFile } from "grammy";
import { OnMessageContext, OnCallBackQueryData } from "../types";
import { SDImagesBotBase } from './SDImagesBotBase';
import { COMMAND, parseCtx } from './helpers';
import { MODELS_CONFIGS } from "./api";

interface ISession {
  id: string;
  author: string;
  prompt: string;
  all_seeds: string[];
  type: COMMAND;
}

export class SDImagesBot extends SDImagesBotBase {
  private sessions: ISession[] = [];

  public isSupportedEvent(
    ctx: OnMessageContext | OnCallBackQueryData
  ): boolean {
    const operation = !!parseCtx(ctx);

    const hasCallbackQuery = this.isSupportedCallbackQuery(ctx);

    return hasCallbackQuery || operation;
  }

  public getEstimatedPrice(ctx: any) {
    return 1.5;
  }

  public isSupportedCallbackQuery(
    ctx: OnMessageContext | OnCallBackQueryData
  ): boolean {
    if (!ctx.callbackQuery?.data) {
      return false;
    }

    const [sessionId] = ctx.callbackQuery.data.split("_");

    return !!this.sessions.find((s) => s.id === sessionId);
  }

  public async onEvent(
    ctx: OnMessageContext | OnCallBackQueryData,
    refundCallback: (reason?: string) => void
  ) {
    if (this.isSupportedCallbackQuery(ctx)) {
      // this.onImgSelected(ctx, refundCallback);
      return;
    }

    const operation = parseCtx(ctx);

    if (!operation) {
      console.log(`### unsupported command ${ctx.message?.text}`);
      ctx.reply("### unsupported command");
      return refundCallback("Unsupported command");
    }

    switch (operation.command) {
      case COMMAND.TEXT_TO_IMAGE:
        this.generateImage(
          ctx,
          refundCallback,
          operation.prompt,
          operation.model
        );
        return;

      case COMMAND.HELP:
        await ctx.reply('Stable Diffusion Models: \n');

        MODELS_CONFIGS.forEach(model => {
          ctx.reply(`${model.name}: ${model.link} \n
Using: /${model.aliases[0]} /${model.aliases[1]} /${model.aliases[2]}`);
        })
        return;

      // case COMMAND.TEXT_TO_IMAGES:
      //   this.generateImages();
      //   return;
    }

    console.log(`### unsupported command`);
    ctx.reply("### unsupported command");
  }
}