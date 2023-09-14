import { InlineKeyboard, InputFile } from 'grammy'
import config from '../../config'
import pino, { type Logger } from 'pino'
import { type OnMessageContext } from '../types'
import { getSignClient } from '../qrcode/signClient'
import { ethers } from 'ethers'
import { type SessionTypes } from '@walletconnect/types'
import { PROPOSAL_EXPIRY_MESSAGE } from '@walletconnect/sign-client'
import { generateWcQr } from './utils/qrcode'
import { type Message } from 'grammy/types'

enum SupportedCommands {
  GET = 'get',
  SEND = 'send',
  POOLS = 'pools',
  CONNECT = 'connect',
  CONNECT_HEX = 'connecthex'
}

const sessionMap: Record<number, string> = {}

const defaultProvider = new ethers.providers.JsonRpcProvider(
  config.country.defaultRPC
)

const getUserAddr = (session: SessionTypes.Struct): string => {
  const acc = session.namespaces.eip155.accounts[0]
  return acc.split(':')[2]
}

export class WalletConnect {
  private readonly logger: Logger

  constructor () {
    this.logger = pino({
      name: 'WalletConnect',
      transport: {
        target: 'pino-pretty',
        options: { colorize: true }
      }
    })
    this.logger.info(
      `Wallet started, web app url: ${config.walletc.webAppUrl}`
    )
  }

  public getEstimatedPrice (ctx: any): number {
    return 0
  }

  public isSupportedEvent (ctx: OnMessageContext): boolean {
    return ctx.hasCommand(Object.values(SupportedCommands))
  }

  public async onEvent (ctx: OnMessageContext): Promise<void> {
    const {
      text,
      from: { id: userId, username }
    } = ctx.update.message
    this.logger.info(`Message from ${username} (${userId}): "${text}"`)

    if (ctx.hasCommand(SupportedCommands.CONNECT)) {
      await this.connect(ctx); return
    }

    if (ctx.hasCommand(SupportedCommands.CONNECT_HEX)) {
      await this.connecthex(ctx); return
    }

    if (ctx.hasCommand(SupportedCommands.POOLS)) {
      const keyboard = new InlineKeyboard().webApp(
        'Open',
        `${config.walletc.webAppUrl}/pools`
      )

      await ctx.reply('Swap Pools Info', {
        reply_markup: keyboard,
        message_thread_id: ctx.message?.message_thread_id
      })
      return
    }

    // /wallet send 0x199177Bcc7cdB22eC10E3A2DA888c7811275fc38 0.01
    if (ctx.hasCommand(SupportedCommands.SEND) && text) {
      const [, to = '', amount = ''] = text.split(' ')
      if (to.startsWith('0x') && +amount) {
        await this.send(ctx, to, amount); return
      }
    }

    if (ctx.hasCommand(SupportedCommands.GET)) {
      await this.getBalance(ctx); return
    }

    await ctx.reply('Unsupported command', { message_thread_id: ctx.message?.message_thread_id })
  }

  async requestProposal (): Promise<{
    uri?: string
    approval: () => Promise<SessionTypes.Struct>
  }> {
    const signClient = await getSignClient()

    return await signClient.connect({
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
            'safe_setSettings'
          ],
          chains: ['eip155:1666600000'],
          events: ['chainChanged', 'accountsChanged']
        }
      }
    })
  }

  async connect (ctx: OnMessageContext): Promise<void> {
    const { uri, approval } = await this.requestProposal()
    const qrImgBuffer = await generateWcQr(uri ?? '', 480)

    const message = await ctx.replyWithPhoto(new InputFile(qrImgBuffer, `wallet_connect_${Date.now()}.png`), {
      caption: 'Scan this QR Code to use Wallet Connect with your MetaMask / Gnosis Safe / Timeless wallets\n\nEnter /connecthex to see Web Address',
      parse_mode: 'Markdown',
      message_thread_id: ctx.message?.message_thread_id
    })

    this.requestApproval(ctx, approval, message)
  }

  async connecthex (ctx: OnMessageContext): Promise<void> {
    const { uri, approval } = await this.requestProposal()

    const message = await ctx.reply(`Copy this connection link to use Wallet Connect with your MetaMask / Gnosis Safe / Timeless wallets:\n\n\`${uri}\` `, {
      parse_mode: 'Markdown',
      message_thread_id: ctx.message?.message_thread_id
    })

    this.requestApproval(ctx, approval, message)
  }

  async requestApproval (ctx: OnMessageContext, approval: () => Promise<SessionTypes.Struct>, message: Message.TextMessage | Message.PhotoMessage): Promise<void> {
    try {
      const session = await approval()

      sessionMap[ctx.from.id] = session.topic

      await ctx.api.deleteMessage(ctx.chat.id, message.message_id)
      // ctx.reply('wallet connected: ' + getUserAddr(session));
    } catch (ex: any) {
      await ctx.api.deleteMessage(ctx.chat.id, message.message_id)
      if (ex instanceof Error) {
        this.logger.error('error wc connect ' + ex.message)
        if (ex.message === PROPOSAL_EXPIRY_MESSAGE) {
          return
        }

        await ctx.reply('Error while connection', { message_thread_id: ctx.message?.message_thread_id })
      } else {
        this.logger.error('error wc connect ' + ex.toString())
      }
    }
  }

  async send (ctx: OnMessageContext, addr: string, amount: string): Promise<void> {
    const signClient = await getSignClient()
    const userId = ctx.from.id

    const sessionId = sessionMap[userId]

    if (!sessionId) {
      await ctx.reply('Link wallet with /connect', { message_thread_id: ctx.message?.message_thread_id })
      return
    }

    const session = signClient.session.get(sessionId)

    if (!session) {
      await ctx.reply('Link wallet with /connect', { message_thread_id: ctx.message?.message_thread_id })
      return
    }

    // if(ethers.utils.parseEther(amount).gt(ethers.utils.parseEther('100'))) {
    //   ctx.reply('Deposit cannot exceed 100 ONE');
    //   return
    // }

    const ownerAdd = getUserAddr(session)

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
              data: '0x',
              value: ethers.utils.parseEther(amount).toHexString()
            }
          ]
        }
      }).then(() => {
        console.log('### sent')
      }).catch((ex) => {
        console.log('### ex', ex)
      })
    }, 1000)
  }

  async getBalance (ctx: OnMessageContext): Promise<void> {
    try {
      const signClient = await getSignClient()
      const userId = ctx.from.id

      const sessionId = sessionMap[userId]

      if (!sessionId) {
        await ctx.reply('Link wallet with /connect', { message_thread_id: ctx.message?.message_thread_id })
        return
      }

      const session = signClient.session.get(sessionId)

      if (!session) {
        await ctx.reply('Link wallet with /connect', { message_thread_id: ctx.message?.message_thread_id })
        return
      }

      const ownerAddr = getUserAddr(session)
      const oneBalanceWei = await defaultProvider.getBalance(ownerAddr)
      const oneBalance = ethers.utils.formatEther(oneBalanceWei)

      const message = `💰 *My Wallet*                    
      
*ONE*: ${Number(oneBalance).toFixed(2)} ONE       

*TON*: 0 TON       

*USDT*: 0 USDT       
`
      await ctx.reply(message, {
        parse_mode: 'Markdown',
        message_thread_id: ctx.message?.message_thread_id
      })
    } catch (ex) {
      await ctx.reply('Unknown error', { message_thread_id: ctx.message?.message_thread_id })
    }
  }
}
