import {StableDiffusionClient} from "./StableDiffusionClient";
import {createQRCode, isQRCodeReadable, retryAsync} from "./utils";
import config from "../../config";
import {InputFile} from "grammy";
import {OnMessageContext} from "../types";

enum SupportedCommands {
  QR = 'qr',
  QR2 = 'qr2',
  QR_MARGIN = 'qrMargin'
}

export class QRCodeBot {
  constructor() {}

  // public init() {
  //   this.bot.command('qr', (ctx) => this.onQr(ctx, 'img2img'));
  //   this.bot.command('qr2', (ctx) => this.onQr(ctx, 'txt2img'));
  //   this.bot.command('qrMargin', (ctx) => this.onQrMargin(ctx))
  // }

  public isSupportedEvent(ctx: OnMessageContext): boolean {
    return ctx.hasCommand(Object.values(SupportedCommands));
  }

  public async onEvent(ctx: OnMessageContext) {
    if (!this.isSupportedEvent(ctx)) {
      console.log(`### unsupported command ${ctx.message.text}`);
      return false;
    }

    if (ctx.hasCommand(SupportedCommands.QR)) {
      this.onQr(ctx, 'img2img');
      return;
    }

    if (ctx.hasCommand(SupportedCommands.QR2)) {
      this.onQr(ctx, 'txt2img');
      return;
    }

    if (ctx.hasCommand(SupportedCommands.QR_MARGIN)){
      this.onQrMargin(ctx);
      return;
    }

    console.log(`### unsupported command`);
    ctx.reply('### unsupported command');
  }

  public parseQrCommand(message: string) {
    // command: /qr url prompt1, prompt2, prompt3
    const [command, url, ...rest] = message.split(' ');

    return {
      command,
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
    return ctx.reply('qrMargin: ' + ctx.session.qrMargin)
  }

  private async onQr(ctx: OnMessageContext, method: 'txt2img' | 'img2img') {
    ctx.reply("Wait a minute...")

    const command = this.parseQrCommand(ctx.message?.text || '');
    const messageText = ctx.message?.text;

    const operation = async (retryAttempts: number) => {

      console.log(`### retry: ${retryAttempts} ${messageText}`);

      const props = {
        qrUrl: command.url,
        qrMargin: 1,
        method,
        prompt: command.prompt,
      };

      const qrImgBuffer = await this.genQRCode(props);

      if (!qrImgBuffer) {
        throw new Error('internal error');
      }

      if(config.qr.checkReadable && isQRCodeReadable(qrImgBuffer)) {
        console.log('### qr unreadable');
        return qrImgBuffer;
      }

      return qrImgBuffer;
    }

    let qrImgBuffer;

    try {
      qrImgBuffer = await retryAsync(operation, 5, 100);

    } catch (ex) {
      console.log('### ex', ex);
      ctx.reply("internal error")
      return;
    }

    await ctx.replyWithPhoto(new InputFile(qrImgBuffer, `qr_code_${Date.now()}.png`), {
      caption: messageText,
    })
  }

  private async genQRCode({qrUrl, qrMargin, prompt, method}: {qrUrl: string, qrMargin: number, prompt: string, method: 'img2img' | 'txt2img'}) {
    const qrImgBuffer = await createQRCode({url: qrUrl, margin: qrMargin });
    const sdClient = new StableDiffusionClient();

    if (method === 'txt2img') {
      return  sdClient.text2img({imgBase64: qrImgBuffer.toString('base64'), prompt});
    }

    return  sdClient.img2img({imgBase64: qrImgBuffer.toString('base64'), prompt});
  }
}
