import { InlineKeyboard, InputFile } from "grammy";
import { OnMessageContext, OnCallBackQueryData } from "../types";
import { SDImagesBotBase } from './SDImagesBotBase';
import { COMMAND, parseCtx } from './helpers';
import { getModelByParam, IModel, MODELS_CONFIGS } from "./api";
import { uuidv4 } from "./utils";

interface ISession {
  id: string;
  author: string;
  prompt: string;
  model: IModel;
  all_seeds: string[];
  command: COMMAND;
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
      this.onImgSelected(ctx, refundCallback);
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

      case COMMAND.TEXT_TO_IMAGES:
        this.onImagesCmd(
          ctx,
          refundCallback,
          operation.prompt,
          operation.model
        );
        return;

      case COMMAND.CONSTRUCTOR:
        this.onConstructorCmd(
          ctx,
          refundCallback,
          operation.prompt,
          operation.model
        );
        return;

      case COMMAND.HELP:
        await ctx.reply('Stable Diffusion Models: \n');

        for (let i = 0; i < MODELS_CONFIGS.length; i++) {
          const model = MODELS_CONFIGS[i];

          await ctx.reply(`${model.name}: ${model.link} \nUsing: /${model.aliases[0]} /${model.aliases[1]} /${model.aliases[2]}`);
        }
        return;
    }

    console.log(`### unsupported command`);
    ctx.reply("### unsupported command");
  }

  onImagesCmd = async (
    ctx: OnMessageContext | OnCallBackQueryData,
    refundCallback: (reason?: string) => void,
    prompt: string,
    model: IModel
  ) => {
    const uuid = uuidv4();

    try {
      const authorObj = await ctx.getAuthor();
      const author = `@${authorObj.user.username}`;

      await this.waitingQueue(uuid, ctx);

      const res = await this.sdNodeApi.generateImagesPreviews(prompt, model);

      const newSession: ISession = {
        id: uuidv4(),
        author,
        prompt: prompt,
        all_seeds: res.all_seeds,
        model,
        command: COMMAND.TEXT_TO_IMAGES
      };

      this.sessions.push(newSession);

      await ctx.replyWithMediaGroup(
        res.images.map((img, idx) => ({
          type: "photo",
          media: new InputFile(img),
          caption: String(idx + 1),
        }))
      );

      await ctx.reply("Please choose 1 of 4 images for next high quality generation", {
        parse_mode: "HTML",
        reply_markup: new InlineKeyboard()
          .text("1", `${newSession.id}_1`)
          .text("2", `${newSession.id}_2`)
          .text("3", `${newSession.id}_3`)
          .text("4", `${newSession.id}_4`)
          .row()
      });
    } catch (e: any) {
      console.log(e);
      ctx.reply(`Error: something went wrong...`);
      refundCallback(e.message);
    }

    this.queue = this.queue.filter((v) => v !== uuid);
  };

  async onImgSelected(
    ctx: OnMessageContext | OnCallBackQueryData,
    refundCallback: (reason?: string) => void
  ): Promise<any> {
    try {
      const authorObj = await ctx.getAuthor();
      const author = `@${authorObj.user.username}`;

      if (!ctx.callbackQuery?.data) {
        console.log("wrong callbackQuery");
        refundCallback("Wrong callbackQuery");
        return;
      }

      const [sessionId, ...paramsArray] = ctx.callbackQuery.data.split("_");

      const params = paramsArray.join('_');

      if (!sessionId || !params) {
        refundCallback("Wrong params");
        return;
      }

      const session = this.sessions.find((s) => s.id === sessionId);

      if (!session || session.author !== author) {
        refundCallback("Wrong author");
        return;
      }

      let model;

      if (session.command === COMMAND.CONSTRUCTOR) {
        model = getModelByParam(params);

        if (!model) {
          console.log("wrong model");
          refundCallback("Wrong callbackQuery");
          return;
        }

        this.generateImage(
          ctx,
          refundCallback,
          session.prompt,
          model
        );

        return;
      }

      if (session.command === COMMAND.TEXT_TO_IMAGES) {
        this.generateImage(
          ctx,
          refundCallback,
          session.prompt,
          session.model,
          Number(session.all_seeds[+params - 1])
        );

        return;
      }
    } catch (e: any) {
      console.log(e);
      ctx.reply(`Error: something went wrong...`);
      refundCallback(e.message);
    }
  }

  onConstructorCmd = async (
    ctx: OnMessageContext | OnCallBackQueryData,
    refundCallback: (reason?: string) => void,
    prompt: string,
    model: IModel
  ) => {
    try {
      const authorObj = await ctx.getAuthor();
      const author = `@${authorObj.user.username}`;

      const newSession: ISession = {
        id: uuidv4(),
        author,
        prompt: String(prompt),
        all_seeds: [],
        model,
        command: COMMAND.CONSTRUCTOR
      };

      this.sessions.push(newSession);

      const buttonsPerRow = 2;
      let rowCount = buttonsPerRow;
      const keyboard = new InlineKeyboard();

      for (let i = 0; i < MODELS_CONFIGS.length; i++) {
        keyboard.text(MODELS_CONFIGS[i].name, `${newSession.id}_${MODELS_CONFIGS[i].hash}`);

        rowCount--;

        if (!rowCount) {
          keyboard.row();
          rowCount = buttonsPerRow;
        }
      }

      keyboard.row();

      await ctx.reply(prompt, {
        parse_mode: "HTML",
        reply_markup: keyboard
      });
    } catch (e: any) {
      console.log(e);
      ctx.reply(`Error: something went wrong...`);
      refundCallback(e);
    }
  };
}