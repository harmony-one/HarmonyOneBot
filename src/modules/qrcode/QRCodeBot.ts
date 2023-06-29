import {StableDiffusionClient} from "./StableDiffusionClient";
import {createQRCode, isQRCodeReadable, retryAsync} from "./utils";
import config from "../../config";
import {Bot, CommandContext, InputFile} from "grammy";
import {BotContext} from "../types";

enum SupportedCommands {
  QR = '/qr',
  QR2 = '/qr2',
  QR_MARGIN = '/qrMargin'
}

export class QRCodeBot {
  private readonly bot: Bot<BotContext>;

  constructor(bot: Bot<BotContext>) {
    this.bot = bot;
  }

  public init() {
    this.bot.command('qr', (ctx) => this.onQr(ctx, 'img2img'));
    this.bot.command('qr2', (ctx) => this.onQr(ctx, 'txt2img'));
    this.bot.command('qrMargin', (ctx) => this.onQrMargin(ctx))
  }

  public isSupportedEvent(ctx: any) {
    return false;
  }

  public parseCommand(message: string) {
    // command: /qr url prompt1, prompt2, prompt3
    const [command, url, ...rest] = message.split(' ');

    return {
      command,
      url,
      prompt: rest.join(' '),
    }
  }

  private async onQrMargin(ctx: CommandContext<BotContext>) {
    const margin = parseInt(ctx.match, 10);

    if (!isNaN(margin)) {
      ctx.session.qrMargin = margin;
    }
    return ctx.reply('qrMargin: ' + ctx.session.qrMargin)
  }

  private async onQr(ctx: CommandContext<BotContext>, method: 'txt2img' | 'img2img') {
    ctx.reply("Wait a minute...")

    const command = this.parseCommand(ctx.message?.text || '');
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
