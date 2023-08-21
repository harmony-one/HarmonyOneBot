import { SDNodeApi } from "./sd-node-api";
import config from "../../config";
import { InlineKeyboard, InputFile } from "grammy";
import { OnMessageContext, OnCallBackQueryData } from "../types";
import { sleep, uuidv4 } from "./utils";
import { showcasePrompts } from "./showcase";
import { AbortController, AbortSignal } from "grammy/out/shim.node";
import { MODELS_CONFIGS, getModelByParam } from "./models-config";

enum SupportedCommands {
  IMAGE = "image",
  IMAGES = "images",
  // SHOWCASE = 'image_example',
}

enum SESSION_STEP {
  IMAGE_SELECT = "IMAGE_SELECT",
  IMAGE_GENERATED = "IMAGE_GENERATED",
}

enum OPERATION_TYPE {
  GEN_4_IMAGES = "GEN_4_IMAGES",
  GEN_IMAGE_MANY_MODELS = "GEN_IMAGE_MANY_MODELS",
}

interface ISession {
  id: string;
  author: string;
  step: SESSION_STEP;
  prompt: string;
  all_seeds: string[];
  type: OPERATION_TYPE;
}

export class SDImagesBot {
  sdNodeApi: SDNodeApi;

  private queue: string[] = [];
  private sessions: ISession[] = [];
  private showcaseCount = 0;

  constructor() {
    this.sdNodeApi = new SDNodeApi();
  }

  public isSupportedEvent(
    ctx: OnMessageContext | OnCallBackQueryData
  ): boolean {
    const hasCommand = ctx.hasCommand(Object.values(SupportedCommands));

    const hasCallbackQuery = this.isSupportedCallbackQuery(ctx);

    return hasCallbackQuery || hasCommand;
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
    if (!this.isSupportedEvent(ctx)) {
      console.log(`### unsupported command ${ctx.message?.text}`);
      ctx.reply("### unsupported command");
      return refundCallback("Unsupported command");
    }

    if (ctx.hasCommand(SupportedCommands.IMAGE)) {
      this.onImageCmd(ctx, refundCallback);
      return;
    }

    if (ctx.hasCommand(SupportedCommands.IMAGES)) {
      this.onImagesCmd(ctx, refundCallback);
      return;
    }

    // if (ctx.hasCommand(SupportedCommands.SHOWCASE)) {
    //     this.onShowcaseCmd(ctx);
    //     return;
    // }

    if (this.isSupportedCallbackQuery(ctx)) {
      this.onImgSelected(ctx, refundCallback);
      return;
    }

    console.log(`### unsupported command`);
    ctx.reply("### unsupported command");
  }

  waitingQueue = async (uuid: string, ctx: OnMessageContext | OnCallBackQueryData,) => {
    this.queue.push(uuid);

    let idx = this.queue.findIndex((v) => v === uuid);

    if (idx !== 0) {
      ctx.reply(
        `You are ${idx + 1}/${this.queue.length
        }, wait about ${idx * 30} seconds`
      );
    }

    // waiting queue
    while (idx !== 0) {
      await sleep(3000 * this.queue.findIndex((v) => v === uuid));
      idx = this.queue.findIndex((v) => v === uuid);
    }
  }

  onImageCmd = async (
    ctx: OnMessageContext | OnCallBackQueryData,
    refundCallback: (reason?: string) => void
  ) => {
    // /qr s.country/ai astronaut, exuberant, anime girl, smile, sky, colorful
    try {
      const prompt: any = ctx.match
        ? ctx.match
        : config.stableDiffusion.imageDefaultMessage;

      const authorObj = await ctx.getAuthor();
      const author = `@${authorObj.user.username}`;

      if (!prompt) {
        ctx.reply(`${author} please add prompt to your message`);
        refundCallback("Wrong prompts");
        return;
      }
      ctx.chatAction = "upload_photo";

      let modelParam = '';
      let promptParam: any;

      try {
        [modelParam, ...promptParam] = prompt.split('--model=')[1].split(' ');
        promptParam = promptParam.join(' ');
      } catch (e) { }

      if (modelParam && promptParam) {
        this.generateImage(
          ctx,
          refundCallback,
          promptParam,
          modelParam
        );

        return;
      }

      const newSession: ISession = {
        id: uuidv4(),
        author,
        prompt: String(prompt),
        step: SESSION_STEP.IMAGE_SELECT,
        all_seeds: [],
        type: OPERATION_TYPE.GEN_IMAGE_MANY_MODELS
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

      await ctx.reply("Please choose model for image generation", {
        parse_mode: "HTML",
        reply_markup: keyboard
      });
    } catch (e: any) {
      console.log(e);
      ctx.reply(`Error: something went wrong...`);
      refundCallback(e);
    }
  };

  // onImageCmd = async (
  //   ctx: OnMessageContext | OnCallBackQueryData,
  //   refundCallback: (reason?: string) => void
  // ) => {
  //   const uuid = uuidv4();

  //   // /qr s.country/ai astronaut, exuberant, anime girl, smile, sky, colorful
  //   try {
  //     const prompt: any = ctx.match
  //       ? ctx.match
  //       : config.stableDiffusion.imageDefaultMessage;

  //     const authorObj = await ctx.getAuthor();
  //     const author = `@${authorObj.user.username}`;

  //     if (!prompt) {
  //       ctx.reply(`${author} please add prompt to your message`);
  //       refundCallback("Wrong prompts");
  //       return;
  //     }
  //     ctx.chatAction = "upload_photo";
  //     this.queue.push(uuid);

  //     let idx = this.queue.findIndex((v) => v === uuid);

  //     if (idx !== 0) {
  //       ctx.reply(
  //         `You are ${idx + 1}/${
  //           this.queue.length
  //         }, wait about ${idx * 30} seconds`
  //       );
  //     }

  //     // waiting queue
  //     while (idx !== 0) {
  //       await sleep(3000 * this.queue.findIndex((v) => v === uuid));
  //       idx = this.queue.findIndex((v) => v === uuid);
  //     }

  //     const imageBuffer = await this.sdNodeApi.generateImage(prompt);
  //     await ctx.replyWithPhoto(new InputFile(imageBuffer), {
  //       caption: `/image ${prompt}`,
  //     });

  //     // await ctx.reply(`/image ${prompt}`);
  //   } catch (e: any) {
  //     console.log(e);
  //     this.queue = this.queue.filter((v) => v !== uuid);

  //     ctx.reply(`Error: something went wrong...`);

  //     refundCallback(e);
  //   }

  //   this.queue = this.queue.filter((v) => v !== uuid);
  // };

  onImagesCmd = async (
    ctx: OnMessageContext | OnCallBackQueryData,
    refundCallback: (reason?: string) => void
  ) => {
    const uuid = uuidv4();

    try {
      const prompt: any = ctx.match
        ? ctx.match
        : config.stableDiffusion.imagesDefaultMessage;

      const authorObj = await ctx.getAuthor();
      const author = `@${authorObj.user.username}`;

      if (!prompt) {
        ctx.reply(`${author} please add prompt to your message`);

        refundCallback("Wrong prompts");
        return;
      }
      ctx.chatAction = "upload_photo";
      this.queue.push(uuid);

      let idx = this.queue.findIndex((v) => v === uuid);

      if (idx !== 0) {
        ctx.reply(
          `You are ${idx + 1}/${this.queue.length
          }, wait about ${idx * 30} seconds`
        );
      }

      // waiting queue
      while (idx !== 0) {
        await sleep(3000 * this.queue.findIndex((v) => v === uuid));

        idx = this.queue.findIndex((v) => v === uuid);
      }

      // ctx.reply(`${author} starting to generate your images`);
      const res = await this.sdNodeApi.generateImagesPreviews(prompt);

      // res.images.map(img => new InputFile(Buffer.from(img, 'base64')));

      const newSession: ISession = {
        id: uuidv4(),
        author,
        prompt: String(prompt),
        step: SESSION_STEP.IMAGE_SELECT,
        all_seeds: res.all_seeds,
        type: OPERATION_TYPE.GEN_4_IMAGES
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
      this.queue = this.queue.filter((v) => v !== uuid);

      ctx.reply(`Error: something went wrong...`);

      refundCallback(e.message);
    }

    this.queue = this.queue.filter((v) => v !== uuid);
  };

  generateImage = async (
    ctx: OnMessageContext | OnCallBackQueryData,
    refundCallback: (reason?: string) => void,
    prompt: string,
    modelId: string
  ) => {
    const uuid = uuidv4();

    try {
      const model = getModelByParam(modelId);

      if(!model) {
        ctx.reply(`Error: Wrong model... Refunding payments`);
        refundCallback();
        return;
      }

      await this.waitingQueue(uuid, ctx);

      ctx.chatAction = "upload_photo";

      const imageBuffer = await this.sdNodeApi.generateImage(
        prompt,
        model.id
      );

      await ctx.replyWithPhoto(new InputFile(imageBuffer), {
        caption: `/image --model=${model.shortName} ${prompt}`,
      });
    } catch (e) {
      console.error(e);
      ctx.reply(`Error: something went wrong... Refunding payments`);
      refundCallback();
    }

    this.queue = this.queue.filter((v) => v !== uuid);
  }

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

      if (isNaN(Number(params))) {
        const model = getModelByParam(params);

        if (!model) {
          console.log("wrong model");
          refundCallback("Wrong callbackQuery");
          return;
        }

        this.generateImage(
          ctx,
          refundCallback,
          session.prompt,
          model.shortName
        );
      } else {
        const imageBuffer = await this.sdNodeApi.generateImageFull(
          session.prompt,
          +session.all_seeds[+params - 1]
        );

        await ctx.replyWithPhoto(new InputFile(imageBuffer), {
          caption: `/image --seed=${session.all_seeds[+params - 1]} ${session.prompt}`,
        });
      }
    } catch (e: any) {
      console.log(e);
      ctx.reply(`Error: something went wrong...`);

      refundCallback(e.message);
    }
  }

  onShowcaseCmd = async (ctx: OnMessageContext | OnCallBackQueryData) => {
    const uuid = uuidv4();

    try {
      if (this.showcaseCount >= showcasePrompts.length) {
        this.showcaseCount = 0;
      }

      const prompt = showcasePrompts[this.showcaseCount++];

      const imageBuffer = await this.sdNodeApi.generateImage(prompt, 'deliberate_v2');

      await ctx.replyWithPhoto(new InputFile(imageBuffer));

      await ctx.reply(`/image ${prompt}`);
    } catch (e: any) {
      console.log(e);
      await ctx.reply(`Error: something went wrong...`);

      // throw new Error(e?.message);
    }
  };
}
