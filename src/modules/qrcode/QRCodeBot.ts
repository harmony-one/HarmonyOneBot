import { Automatic1111Client } from "./Automatic1111Client";
import {
  createQRCode,
  isQRCodeReadable,
  normalizeUrl,
  retryAsync,
} from "./utils";
import config from "../../config";
import { GrammyError, InlineKeyboard, InputFile } from "grammy";
import {
  MessageExtras,
  OnCallBackQueryData,
  OnMessageContext,
  RefundCallback,
} from "../types";
import { Automatic1111Config } from "./Automatic1111Configs";
import { automatic1111DefaultConfig } from "./Automatic1111DefaultConfig";
import { ComfyClient } from "./comfy/ComfyClient";
import crypto from "crypto";
import buildQRWorkflow from "./comfy/buildQRWorkflow";
import pino, { Logger } from "pino";

enum SupportedCommands {
  QR = "qr",
}

enum Callbacks {
  Regenerate = "qr-regenerate",
}

export class QRCodeBot {
  private logger: Logger;
  constructor() {
    this.logger = pino({
      name: "QRBot",
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
        },
      },
    });
  }

  public getEstimatedPrice(ctx: any) {
    return 1; //  1.5;
  }

  public isSupportedEvent(
    ctx: OnMessageContext | OnCallBackQueryData
  ): boolean {
    return (
      ctx.hasCommand(Object.values(SupportedCommands)) ||
      ctx.hasCallbackQuery(Object.values(Callbacks))
    );
  }

  public async onEvent(
    ctx: OnMessageContext | OnCallBackQueryData,
    refundCallback: RefundCallback
  ) {
    if (!this.isSupportedEvent(ctx)) {
      await ctx.reply(`Unsupported command: ${ctx.message?.text}`);
      return refundCallback("Unsupported command");
    }

    try {
      if (ctx.hasCallbackQuery(Callbacks.Regenerate)) {
        try {
          await ctx.answerCallbackQuery();
        } catch (ex) {
          console.log("### ex", ex);
        }

        const msg =
          ctx.callbackQuery.message?.text ||
          ctx.callbackQuery.message?.caption ||
          "";

        if (!msg) {
          await ctx.reply("Error: message is too old");
          return refundCallback("Error: message is too old");
        }

        const cmd = this.parseQrCommand(msg);

        if (cmd.error || !cmd.command || !cmd.url || !cmd.prompt) {
          await ctx.reply("Message haven't contain command: " + msg);
          return refundCallback("Message haven't contain command: ");
        }

        if (cmd.command === SupportedCommands.QR) {
          return this.onQr(ctx, msg, "img2img");
        }
      }

      if (ctx.hasCommand(SupportedCommands.QR)) {
        return this.onQr(ctx, ctx.message.text, "img2img");
      }
    } catch (ex) {
      if (ex instanceof Error) {
        this.logger.info("Error " + ex.message);
        return refundCallback(ex.message);
      }

      this.logger.info("Error " + ex);
      return refundCallback("Unknown error");
    }

    await ctx.reply("Unsupported command");
    this.logger.info("Unsupported command");
    return refundCallback("Unsupported command");
  }

  public parseQrCommand(message: string) {
    // command: /qr url prompt1, prompt2, prompt3

    if (!message.startsWith("/")) {
      return {
        command: "",
        url: "",
        prompt: "",
        error: true,
      };
    }

    const [command, url, ...rest] = message.split(" ");

    return {
      command: command.replace("/", ""),
      url,
      prompt: rest.join(" "),
    };
  }

  private async onQr(
    ctx: OnMessageContext | OnCallBackQueryData,
    message: string,
    method: "txt2img" | "img2img"
  ) {
    this.logger.info("generate qr");

    const command = this.parseQrCommand(message);

    if (command.error || !command.command || !command.url || !command.prompt) {
      command.url = "https://s.country/ai";
      command.prompt = "astronaut, exuberant, anime girl, smile, sky, colorful";
      //       ctx.reply(`
      // Please add <URL> <PROMPT>
      //
      // /qr h.country/ai Dramatic bonfire on a remote beach, captured at the magic hour with flames dancing against the twilight sky; using a shallow depth of field, a fast lens, and controlled exposure to emphasize the intricate patterns and textures of the fire, complemented by embers in the wind and the gentle glow reflecting on the ocean's edge, moody, intense, and alive.`, {
      //         disable_web_page_preview: true,
      //       });
      //       return
    }

    // ctx.reply(`Generating...`);

    const messageText = message;

    const operation = async (retryAttempts: number) => {
      this.logger.info(`### generate: ${retryAttempts} ${messageText}`);

      const props = {
        qrUrl: command.url,
        qrMargin: 1,
        method,
        prompt: command.prompt,
      };
      const qrImgBuffer = await this.genQRCodeByComfyUI(props);
      if (!qrImgBuffer) {
        throw new Error("internal error");
      }
      if (config.qrBot.checkReadable && isQRCodeReadable(qrImgBuffer)) {
        console.log("### qr unreadable");
        return qrImgBuffer;
      }
      return qrImgBuffer;
    };

    let qrImgBuffer;

    try {
      ctx.chatAction = "upload_photo";
      qrImgBuffer = await retryAsync(operation, 5, 100);
    } catch (ex) {
      ctx.chatAction = null;
      this.logger.error(`ex ${ex}`);
      await ctx.reply("Internal error");
      throw new Error("Internal error");
    }

    const regenButton = new InlineKeyboard().text(
      "Regenerate",
      Callbacks.Regenerate
    );

    try {
      await ctx.replyWithPhoto(
        new InputFile(qrImgBuffer, `qr_code_${Date.now()}.png`),
        {
          caption: `/qr ${command.url} ${command.prompt}`,
          reply_markup: regenButton,
        }
      );
      this.logger.info("sent qr code");
      return true;
    } catch (e: any) {
      const topicId = await ctx.message?.message_thread_id;
      let msgExtras: MessageExtras = {};
      if (topicId) {
        msgExtras["message_thread_id"] = topicId;
      }
      if (e instanceof GrammyError) {
        if (
          e.error_code === 400 &&
          e.description.includes("not enough rights")
        ) {
          ctx.reply(
            `Error: The bot does not have permission to send photos in chat...`,
            msgExtras
          );
        } else {
          ctx.reply(
            `Error: something went wrong...`,
            msgExtras
          );
        }
      } else {
        this.logger.error(e.toString());
        ctx.reply(
          `Error: something went wrong...`,
          msgExtras
        );
      }
      return false;
    }
  }

  private async genQRCode({
    qrUrl,
    qrMargin,
    prompt,
    method,
  }: {
    qrUrl: string;
    qrMargin: number;
    prompt: string;
    method: "img2img" | "txt2img";
  }) {
    const qrImgBuffer = await createQRCode({ url: qrUrl, margin: qrMargin });
    const sdClient = new Automatic1111Client();

    const extendedPrompt =
      prompt + ", " + automatic1111DefaultConfig.additionalPrompt;
    const negativePrompt = automatic1111DefaultConfig.defaultNegativePrompt;

    const sdConfig: Automatic1111Config = {
      imgBase64: qrImgBuffer.toString("base64"),
      prompt: extendedPrompt,
      negativePrompt,
    };

    if (method === "txt2img") {
      return sdClient.text2img({
        ...automatic1111DefaultConfig.text2img,
        ...sdConfig,
      });
    }

    return sdClient.img2img({
      ...automatic1111DefaultConfig.img2img,
      ...sdConfig,
    });
  }

  private async genQRCodeByComfyUI({
    qrUrl,
    qrMargin,
    prompt,
    method,
  }: {
    qrUrl: string;
    qrMargin: number;
    prompt: string;
    method: "img2img" | "txt2img";
  }) {
    const qrImgBuffer = await createQRCode({
      url: normalizeUrl(qrUrl),
      width: 680,
      margin: qrMargin,
    });
    const extendedPrompt =
      prompt + ", " + automatic1111DefaultConfig.additionalPrompt;
    const negativePrompt = automatic1111DefaultConfig.defaultNegativePrompt;

    const comfyClient = new ComfyClient({
      host: config.comfyHost2,
      wsHost: config.comfyWsHost2,
    });

    const filenameHash = crypto.createHash("sha256").update(qrUrl, "utf8");
    const filename = filenameHash.digest("hex") + ".png";
    const uploadResult = await comfyClient.uploadImage({
      filename,
      fileBuffer: qrImgBuffer,
      override: true,
    });

    const workflow = buildQRWorkflow({
      qrFilename: uploadResult.name,
      clientId: comfyClient.clientId,
      negativePrompt,
      prompt: extendedPrompt,
    });

    const response = await comfyClient.queuePrompt(workflow);
    const promptResult = await comfyClient.waitingPromptExecution(
      response.prompt_id
    );
    comfyClient.abortWebsocket();
    return comfyClient.downloadResult(
      promptResult.data.output.images[0].filename
    );
  }
}
