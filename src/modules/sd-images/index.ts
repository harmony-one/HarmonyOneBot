import { InlineKeyboard, InputFile } from "grammy";
import { OnMessageContext, OnCallBackQueryData } from "../types";
import { SDImagesBotBase } from "./SDImagesBotBase";
import { COMMAND, IOperation, parseCtx, promptHasBadWords } from "./helpers";
import { getModelByParam, IModel, MODELS_CONFIGS } from "./api";
import { uuidv4 } from "./utils";
import { sendMessage } from "../open-ai/helpers";

export class SDImagesBot extends SDImagesBotBase {
  public isSupportedEvent(
    ctx: OnMessageContext | OnCallBackQueryData
  ): boolean {
    const photos = ctx.message?.photo;

    if (photos && ctx.message?.media_group_id) {
      this.addMediaGroupPhoto({
        photoId: photos[photos.length - 1].file_id,
        mediaGroupId: ctx.message.media_group_id,
        caption: ctx.message.caption || ''
      });
    }

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

    return !!this.getSessionById(sessionId);
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

    const photo = ctx.message?.photo;

    if (!operation) {
      console.log(`### unsupported command ${ctx.message?.text}`);
      await sendMessage(ctx, "### unsupported command");
      return refundCallback("Unsupported command");
    }

    const prompt = operation.prompt;
    let parsedPrompt = prompt
      .substring(prompt.indexOf(" ") + 1, prompt.indexOf("--"))
      .trim();

    if (promptHasBadWords(parsedPrompt)) {
      console.log(`### promptHasBadWords ${ctx.message?.text}`);
      await sendMessage(
        ctx,
        "Your prompt has been flagged for potentially generating illegal or malicious content. If you believe there has been a mistake, please reach out to support."
      );
      return refundCallback("Prompt has bad words");
    }

    if (prompt.length > 1000) {
      await ctx.reply("Your prompt is too long. Please shorten your prompt and try again.");
      return refundCallback("Prompt is too long");
    }
    switch (operation.command) {
      case COMMAND.TEXT_TO_IMAGE:
        this.generateImage(
          ctx,
          refundCallback,
          await this.createSession(ctx, operation)
        );
        return;

      case COMMAND.TRAIN:
        this.trainLoraByImages(
          ctx,
          refundCallback,
          await this.createSession(ctx, operation)
        );
        return;

      case COMMAND.IMAGE_TO_IMAGE:
        this.generateImageByImage(
          ctx,
          refundCallback,
          await this.createSession(ctx, operation)
        );
        return;

      case COMMAND.TEXT_TO_IMAGES:
        this.onImagesCmd(ctx, refundCallback, operation);
        return;

      case COMMAND.CONSTRUCTOR:
        this.onConstructorCmd(ctx, refundCallback, operation);
        return;

      case COMMAND.HELP:
        await sendMessage(ctx, "Stable Diffusion Models: \n");

        for (let i = 0; i < MODELS_CONFIGS.length; i++) {
          const model = MODELS_CONFIGS[i];

          await sendMessage(
            ctx,
            `${model.name}: ${model.link} \n \nUsing: /${model.aliases[0]} /${model.aliases[1]} /${model.aliases[2]} \n`
          );
        }
        return;
    }

    console.log(`### unsupported command`);
    sendMessage(ctx, "### unsupported command");
  }

  onImagesCmd = async (
    ctx: OnMessageContext | OnCallBackQueryData,
    refundCallback: (reason?: string) => void,
    operation: IOperation
  ) => {
    const uuid = uuidv4();

    try {
      await this.waitingQueue(uuid, ctx);
      const { prompt, model } = operation;

      const res = await this.sdNodeApi.generateImagesPreviews({
        prompt,
        model,
      });

      const newSession = await this.createSession(ctx, {
        ...operation,
        all_seeds: res.all_seeds,
      });
      const extras = {
        message_thread_id: ctx.message?.message_thread_id,
      };
      await ctx.replyWithMediaGroup(
        res.images.map((img, idx) => ({
          type: "photo",
          media: new InputFile(img),
          caption: String(idx + 1),
        })),
        extras
      );

      await ctx.reply(
        "Please choose 1 of 4 images for next high quality generation",
        {
          parse_mode: "HTML",
          reply_markup: new InlineKeyboard()
            .text("1", `${newSession.id}_1`)
            .text("2", `${newSession.id}_2`)
            .text("3", `${newSession.id}_3`)
            .text("4", `${newSession.id}_4`)
            .row(),
          message_thread_id: ctx.message?.message_thread_id,
        }
      );
    } catch (e: any) {
      console.log(e);
      sendMessage(ctx, `Error: something went wrong...`);
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

      const params = paramsArray.join("_");

      if (!sessionId || !params) {
        refundCallback("Wrong params");
        return;
      }

      const session = this.getSessionById(sessionId);

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

        this.generateImage(ctx, refundCallback, { ...session, model });

        return;
      }

      if (session.command === COMMAND.TEXT_TO_IMAGES) {
        this.generateImage(ctx, refundCallback, {
          ...session,
          seed: session?.all_seeds && Number(session.all_seeds[+params - 1]),
        });

        return;
      }
    } catch (e: any) {
      console.log(e);
      sendMessage(ctx, `Error: something went wrong...`);
      refundCallback(e.message);
    }
  }

  onConstructorCmd = async (
    ctx: OnMessageContext | OnCallBackQueryData,
    refundCallback: (reason?: string) => void,
    operation: IOperation
  ) => {
    try {
      const newSession = await this.createSession(ctx, operation);

      const buttonsPerRow = 2;
      let rowCount = buttonsPerRow;
      const keyboard = new InlineKeyboard();

      for (let i = 0; i < MODELS_CONFIGS.length; i++) {
        keyboard.text(
          MODELS_CONFIGS[i].name,
          `${newSession.id}_${MODELS_CONFIGS[i].hash}`
        );

        rowCount--;

        if (!rowCount) {
          keyboard.row();
          rowCount = buttonsPerRow;
        }
      }

      keyboard.row();

      await ctx.reply(newSession.message, {
        parse_mode: "HTML",
        reply_markup: keyboard,
        message_thread_id: ctx.message?.message_thread_id,
      });
    } catch (e: any) {
      console.log(e);
      sendMessage(ctx, `Error: something went wrong...`);
      refundCallback(e);
    }
  };
}
