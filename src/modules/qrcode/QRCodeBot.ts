import {StableDiffusionClient} from "./StableDiffusionClient";
import {createQRCode, isQRCodeReadable, retryAsync} from "./utils";
import config from "../../config";
import {InlineKeyboard, InputFile} from "grammy";
import {OnCallBackQueryData, OnMessageContext} from "../types";

enum SupportedCommands {
  QR = 'qr',
  QR2 = 'qr2',
  QR_MARGIN = 'qrMargin',
}

enum Callbacks {
  Regenerate = 'qr-regenerate',
}

export class QRCodeBot {
  constructor() {}

  // public init() {
  //   this.bot.command('qr', (ctx) => this.onQr(ctx, 'img2img'));
  //   this.bot.command('qr2', (ctx) => this.onQr(ctx, 'txt2img'));
  //   this.bot.command('qrMargin', (ctx) => this.onQrMargin(ctx))
  // }

  public isSupportedEvent(ctx: OnMessageContext | OnCallBackQueryData): boolean {
    return ctx.hasCommand(Object.values(SupportedCommands)) || ctx.hasCallbackQuery(Object.values(Callbacks));
  }

  public async onEvent(ctx: OnMessageContext | OnCallBackQueryData) {
    if (!this.isSupportedEvent(ctx)) {
      ctx.reply(`Unsupported command: ${ctx.message?.text}`);
      return false;
    }

    if (ctx.hasCallbackQuery(Callbacks.Regenerate)) {
      await ctx.answerCallbackQuery();

      const msg = ctx.callbackQuery.message?.text || ctx.callbackQuery.message?.caption || '';

      if (!msg) {
        ctx.reply('Error: message is too old');
        return;
      }

      const cmd = this.parseQrCommand(msg);

      if (cmd.error || !cmd.command || !cmd.url || !cmd.prompt) {
        ctx.reply('Message haven\'t contain command: ' + msg);
        return;
      }

      if (cmd.command === SupportedCommands.QR) {
        this.onQr(ctx, msg, 'img2img');
        return;
      }

      if (cmd.command === SupportedCommands.QR2) {
        this.onQr(ctx, msg, 'txt2img');
        return;
      }
    }

    if (ctx.hasCommand(SupportedCommands.QR)) {
      this.onQr(ctx, ctx.message.text, 'img2img');
      return;
    }

    if (ctx.hasCommand(SupportedCommands.QR2)) {
      this.onQr(ctx, ctx.message.text, 'txt2img');
      return;
    }

    if (ctx.hasCommand(SupportedCommands.QR_MARGIN)){
      this.onQrMargin(ctx);
      return;
    }

    ctx.reply('Unsupported command');
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
    return ctx.reply('qrMargin: ' + ctx.session.qrMargin)
  }

  private async onQr(ctx: OnMessageContext | OnCallBackQueryData, message: string, method: 'txt2img' | 'img2img') {
    ctx.reply("Wait a minute...")

    const command = this.parseQrCommand(message);
    const messageText = message;

    const operation = async (retryAttempts: number) => {

      console.log(`### generate: ${retryAttempts} ${messageText}`);

      const props = {
        qrUrl: command.url,
        qrMargin: ctx.session.qrMargin,
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
      ctx.reply("Internal error")
      return;
    }

    const regenButton = new InlineKeyboard()
      .text("Regenerate", Callbacks.Regenerate)


    await ctx.replyWithPhoto(new InputFile(qrImgBuffer, `qr_code_${Date.now()}.png`))
    console.log('### qr sent');

    await ctx.reply(messageText, {
      reply_markup: regenButton,
      disable_web_page_preview: true,
    });
  }

  private async genQRCode({qrUrl, qrMargin, prompt, method}: {qrUrl: string, qrMargin: number, prompt: string, method: 'img2img' | 'txt2img'}) {
    const qrImgBuffer = await createQRCode({url: qrUrl, margin: qrMargin });
    const sdClient = new StableDiffusionClient();

    const _prompt = prompt + ',(masterpiece), (best quality), (ultra-detailed), hires';

    if (method === 'txt2img') {
      return  sdClient.text2img({imgBase64: qrImgBuffer.toString('base64'), prompt: _prompt});
    }

    return  sdClient.img2img({imgBase64: qrImgBuffer.toString('base64'), prompt: _prompt});
  }
}
