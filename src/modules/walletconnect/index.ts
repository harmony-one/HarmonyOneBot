import {InlineKeyboard, InputFile} from "grammy";
import config from "../../config";
import pino, { Logger } from "pino";
import { OnMessageContext } from "../types";
import {getSignClient} from "../qrcode/signClient";
import {ethers} from "ethers";
import { SessionTypes } from "@walletconnect/types";
import {PROPOSAL_EXPIRY_MESSAGE} from "@walletconnect/sign-client";
import { generateWcQr } from "./utils/qrcode";

const sessionMap: Record<number, string> = {}

const defaultProvider = new ethers.providers.JsonRpcProvider(
  config.country.defaultRPC
);

const getUserAddr = (session: SessionTypes.Struct) => {
  const acc = session.namespaces['eip155'].accounts[0];
  const addr = acc.split(":")[2];

  return addr;
}

export class WalletConnect {
  private logger: Logger;

  constructor() {
    this.logger = pino({
      name: "WalletConnect",
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
        },
      },
    });
    this.logger.info(
      `Wallet started, web app url: ${config.walletc.webAppUrl}`
    );
  }

  public getEstimatedPrice(ctx: any) {
    return 0;
  }

  public isSupportedEvent(ctx: OnMessageContext) {
    const commands = ['get', 'send', 'pools', 'connect', 'connecthex']
    return commands.find((command) => ctx.hasCommand(command));
  }

  public async onEvent(ctx: OnMessageContext) {
    const {
      text,
      from: { id: userId, username },
    } = ctx.update.message;
    this.logger.info(`Message from ${username} (${userId}): "${text}"`);


    if (ctx.hasCommand('connect')) {
      this.connect(ctx);
      return;
    }

    if (ctx.hasCommand('connecthex')) {
      this.connecthex(ctx)
      return;
    }

    if (ctx.hasCommand('pools')) {
      let keyboard = new InlineKeyboard().webApp(
        "Open",
        `${config.walletc.webAppUrl}/pools`,
      );

      ctx.reply('Swap Pools Info', {
        reply_markup: keyboard,
      });
      return;
    }

    // /wallet send 0x199177Bcc7cdB22eC10E3A2DA888c7811275fc38 0.01
    if (ctx.hasCommand('send') && text) {
      const [, to = "", amount = ""] = text.split(" ");
      if (to.startsWith("0x") && +amount) {
        this.send(ctx, to, amount);
        return;
      }
    }

    if (ctx.hasCommand('get')) {
      this.getBalance(ctx);
      return;
    }

    ctx.reply('Unsupported command');
  }

  async requestProposal() {
    const signClient = await getSignClient();

    return  signClient.connect({
      requiredNamespaces: {
        eip155: {
          methods: [
            'eth_accounts',
            'net_version',
            'eth_chainId',
            'personal_sign',
            'eth_sign',
            'eth_signTypedData',
            'eth_signTypedData_v4',
            'eth_sendTransaction',
            'eth_blockNumber',
            'eth_getBalance',
            'eth_getCode',
            'eth_getTransactionCount',
            'eth_getStorageAt',
            'eth_getBlockByNumber',
            'eth_getBlockByHash',
            'eth_getTransactionByHash',
            'eth_getTransactionReceipt',
            'eth_estimateGas',
            'eth_call',
            'eth_getLogs',
            'eth_gasPrice',
            'wallet_getPermissions',
            'wallet_requestPermissions',
            'safe_setSettings',
          ],
          chains: ['eip155:1666600000'],
          events: ['chainChanged', 'accountsChanged']
        }
      },
    })
  }

  async connect(ctx: OnMessageContext) {
    const { uri, approval } = await this.requestProposal();
    const qrImgBuffer = await generateWcQr(uri || '', 480);

    const message = await ctx.replyWithPhoto(new InputFile(qrImgBuffer, `wallet_connect_${Date.now()}.png`), {
      caption: 'Scan this QR Code to use Wallet Connect with your MetaMask / Gnosis Safe / Timeless wallets\n\nEnter /connecthex to see Web Address',
      parse_mode: 'Markdown'
    });

    try {
      const session = await approval();

      sessionMap[ctx.from.id] = session.topic;

      ctx.api.deleteMessage(ctx.chat.id, message.message_id);
      ctx.reply('wallet connected: ' + getUserAddr(session));
    } catch (ex) {
      ctx.api.deleteMessage(ctx.chat.id, message.message_id);
      if (ex instanceof Error) {
        this.logger.error('error wc connect ' + ex.message)
        if (ex.message === PROPOSAL_EXPIRY_MESSAGE) {
          return;
        }

        ctx.reply('Error while connection');
      }
    }
  }

  async connecthex(ctx: OnMessageContext) {
    const {uri, approval} = await this.requestProposal();

    const message = await ctx.reply(`Copy this connection link to use Wallet Connect with your MetaMask / Gnosis Safe / Timeless wallets:\n\n\`${uri}\` `, {parse_mode: 'Markdown'});

    try {
      const session = await approval();

      sessionMap[ctx.from.id] = session.topic;

      ctx.api.deleteMessage(ctx.chat.id, message.message_id);
      ctx.reply('wallet connected: ' + getUserAddr(session));
    } catch (ex) {
      ctx.api.deleteMessage(ctx.chat.id, message.message_id);
      if (ex instanceof Error) {
        this.logger.error('error wc connect ' + ex.message)
        if (ex.message === PROPOSAL_EXPIRY_MESSAGE) {
          return;
        }

        ctx.reply('Error while connection');
      }
    }
  }



  async send(ctx: OnMessageContext, addr: string, amount: string) {
    const signClient = await getSignClient();
    const userId = ctx.from.id;

    const sessionId = sessionMap[userId];

    if (!sessionId) {
      ctx.reply('Link wallet with /connect');
      return
    }

    const session = signClient.session.get(sessionId);

    if (!session) {
      ctx.reply('Link wallet with /connect');
      return
    }

    // if(ethers.utils.parseEther(amount).gt(ethers.utils.parseEther('100'))) {
    //   ctx.reply('Deposit cannot exceed 100 ONE');
    //   return
    // }

    const ownerAdd = getUserAddr(session);

    // metamask issue: setTimeout
    setTimeout(() => {
      signClient.request({
        topic: session.topic,
        chainId: 'eip155:1666600000',
        request: {
          method: 'eth_sendTransaction',
          params: [
            {
              from: ownerAdd,
              to: addr,
              data: "0x",
              value: ethers.utils.parseEther(amount).toHexString(),
            },
          ]
        }
      }).catch((ex) => {
        console.log('### ex', ex);
      }).then(() => {
        console.log('### sent');
      })
    }, 1000);

  }

  async getBalance(ctx: OnMessageContext) {
    try {
      const signClient = await getSignClient();
      const userId = ctx.from.id;

      const sessionId = sessionMap[userId];

      if (!sessionId) {
        ctx.reply('Link wallet with /connect');
        return
      }

      const session = signClient.session.get(sessionId);

      if (!session) {
        ctx.reply('Link wallet with /connect');
        return
      }

      const ownerAddr = getUserAddr(session);
      const oneBalanceWei = await defaultProvider.getBalance(ownerAddr);
      const oneBalance = ethers.utils.formatEther(oneBalanceWei);

      const message = `💰 *My Wallet*                    
      
*ONE*: ${Number(oneBalance).toFixed(2)} ONE       

*TON*: 0 TON       

*USDT*: 0 USDT       
`
      ctx.reply(message, {
        parse_mode: "Markdown",
      })
    } catch (ex) {
      ctx.reply('Unknown error');
    }
  }
}
