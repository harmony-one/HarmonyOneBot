import {Automatic1111Client} from "./Automatic1111Client";
import {createQRCode, isQRCodeReadable, retryAsync} from "./utils";
import config from "../../config";
import {InlineKeyboard, InputFile} from "grammy";
import {OnCallBackQueryData, OnMessageContext} from "../types";
import {Automatic1111Config} from "./Automatic1111Configs";
import {automatic1111DefaultConfig} from "./Automatic1111DefaultConfig";
import {ComfyClient} from "./comfy/ComfyClient";
import crypto from "crypto";
import buildQRWorkflow from "./comfy/buildQRWorkflow";
import pino, {Logger} from "pino";

enum SupportedCommands {
  QR = 'qr',
  QR2 = 'qr2',
  QR_MARGIN = 'qrMargin',
}

enum Callbacks {
  Regenerate = 'qr-regenerate',
}

export class QRCodeBot {

  private logger: Logger
  constructor() {

    this.logger = pino({
      name: 'QRBot',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true
        }
      }
    })

  }

  // public init() {
  //   this.bot.command('qr', (ctx) => this.onQr(ctx, 'img2img'));
  //   this.bot.command('qr2', (ctx) => this.onQr(ctx, 'txt2img'));
  //   this.bot.command('qrMargin', (ctx) => this.onQrMargin(ctx))
  // }

  public getEstimatedPrice(ctx: any) {
    return 1.5;
  }

  public isSupportedEvent(ctx: OnMessageContext | OnCallBackQueryData): boolean {
    return ctx.hasCommand(Object.values(SupportedCommands)) || ctx.hasCallbackQuery(Object.values(Callbacks));
  }

  public async onEvent(ctx: OnMessageContext | OnCallBackQueryData) {
    if (!this.isSupportedEvent(ctx)) {
      ctx.reply(`Unsupported command: ${ctx.message?.text}`);
      throw new Error('Unsupported command')
    }

    if (ctx.hasCallbackQuery(Callbacks.Regenerate)) {
      try {
        await ctx.answerCallbackQuery();
      } catch (ex) {
        console.log('### ex', ex);
      }

      const msg = ctx.callbackQuery.message?.text || ctx.callbackQuery.message?.caption || '';

      if (!msg) {
        ctx.reply('Error: message is too old');
        throw new Error('Error: message is too old')
      }

      const cmd = this.parseQrCommand(msg);

      if (cmd.error || !cmd.command || !cmd.url || !cmd.prompt) {
        ctx.reply('Message haven\'t contain command: ' + msg);
        throw new Error('Message haven\'t contain command: ' + msg);
      }

      if (cmd.command === SupportedCommands.QR) {
        return this.onQr(ctx, msg, 'img2img');
      }

      if (cmd.command === SupportedCommands.QR2) {
        return this.onQr(ctx, msg, 'txt2img');
      }
    }

    if (ctx.hasCommand(SupportedCommands.QR)) {
      return this.onQr(ctx, ctx.message.text, 'img2img');
    }

    if (ctx.hasCommand(SupportedCommands.QR2)) {
      return this.onQr(ctx, ctx.message.text, 'txt2img');
    }

    if (ctx.hasCommand(SupportedCommands.QR_MARGIN)){
      return this.onQrMargin(ctx);
    }

    ctx.reply('Unsupported command');
    this.logger.info('Unsupported command');
    return new Error('Unsupported command')
  }

  public parseQrCommand(message: string) {
    // command: /qr url prompt1, prompt2, prompt3

    if (!message.startsWith('/')) {
      return {
        command: '',
        url: '',
        prompt: '',
        error: true,
      }
    }

    const [command, url, ...rest] = message.split(' ');

    return {
      command: command.replace('/', ''),
      url,
      prompt: rest.join(' '),
    }
  }

  private async onQrMargin(ctx: OnMessageContext) {
    const [_, value] = (ctx.message?.text || '').split(' ')

    const margin = parseInt(value, 10);

    if (!isNaN(margin)) {
      ctx.session.qrMargin = margin;
    }
    await ctx.reply('qrMargin: ' + ctx.session.qrMargin);
    return true;
  }

  private async onQr(ctx: OnMessageContext | OnCallBackQueryData, message: string, method: 'txt2img' | 'img2img') {
    this.logger.info('generate qr');
    ctx.reply(`Generating...`)

    const command = this.parseQrCommand(message);
    const messageText = message;

    const operation = async (retryAttempts: number) => {
      this.logger.info(`### generate: ${retryAttempts} ${messageText}`);

      const props = {
        qrUrl: command.url,
        qrMargin: ctx.session.qrMargin,
        method,
        prompt: command.prompt,
      };

      const qrImgBuffer = await this.genQRCode2(props);

      if (!qrImgBuffer) {
        throw new Error('internal error');
      }

      if(config.qrBot.checkReadable && isQRCodeReadable(qrImgBuffer)) {
        console.log('### qr unreadable');
        return qrImgBuffer;
      }

      return qrImgBuffer;
    }

    let qrImgBuffer;

    try {
      qrImgBuffer = await retryAsync(operation, 5, 100);

    } catch (ex) {
      this.logger.error(`ex ${ex}`);
      ctx.reply("Internal error")
      throw new Error('Internal error');
    }

    const regenButton = new InlineKeyboard()
      .text("Regenerate", Callbacks.Regenerate)


    await ctx.replyWithPhoto(new InputFile(qrImgBuffer, `qr_code_${Date.now()}.png`), {
      caption: messageText,
      reply_markup: regenButton,
    })
    this.logger.info('sent qr code');
    return true;
  }

  private async genQRCode({qrUrl, qrMargin, prompt, method}: {qrUrl: string, qrMargin: number, prompt: string, method: 'img2img' | 'txt2img'}) {
    const qrImgBuffer = await createQRCode({url: qrUrl, margin: qrMargin });
    const sdClient = new Automatic1111Client();

    const extendedPrompt = prompt + ', ' + automatic1111DefaultConfig.additionalPrompt;
    const negativePrompt = automatic1111DefaultConfig.defaultNegativePrompt;

    const sdConfig: Automatic1111Config = {
      imgBase64: qrImgBuffer.toString('base64'),
      prompt: extendedPrompt,
      negativePrompt,
    };

    if (method === 'txt2img') {
      return  sdClient.text2img({...automatic1111DefaultConfig.text2img, ...sdConfig});
    }

    return  sdClient.img2img({...automatic1111DefaultConfig.img2img, ...sdConfig});
  }

  private async genQRCode2({qrUrl, qrMargin, prompt, method}: {qrUrl: string, qrMargin: number, prompt: string, method: 'img2img' | 'txt2img'}) {
    const qrImgBuffer = await createQRCode({url: qrUrl, margin: qrMargin });
    const extendedPrompt = prompt + ', ' + automatic1111DefaultConfig.additionalPrompt;
    const negativePrompt = automatic1111DefaultConfig.defaultNegativePrompt;

    const comfyClient = new ComfyClient({host: config.comfyHost2, wsHost: config.comfyWsHost2});

    const filenameHash = crypto.createHash('sha256').update(qrUrl, 'utf8');
    const filename = filenameHash.digest('hex') + '.png';

    const uploadResult = await comfyClient.uploadImage({filename, fileBuffer: qrImgBuffer, override: true});

    const workflow = buildQRWorkflow({qrFilename: uploadResult.name, clientId: comfyClient.clientId, negativePrompt, prompt: extendedPrompt})

    const response = await comfyClient.queuePrompt(workflow);
    const promptResult = await comfyClient.waitingPromptExecution(response.prompt_id);
    comfyClient.abortWebsocket();

    return comfyClient.downloadResult(promptResult.data.output.images[0].filename);
  }
}
