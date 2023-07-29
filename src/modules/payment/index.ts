import pino, {Logger} from "pino";
import Web3 from 'web3'
import { Account } from 'web3-core'
import axios from 'axios'
import bn, {BigNumber} from 'bignumber.js'
import config from "../../config";
import {OnMessageContext} from "../types";

interface CoinGeckoResponse {
  harmony: {
    usd: string
  }
}

export class BotPayments {
  private readonly holderAddress = config.payment.holderAddress
  private logger: Logger;
  private web3: Web3;
  private ONERate: number = 0
  private rpcURL = 'https://api.harmony.one'

  constructor() {
    this.web3 = new Web3(this.rpcURL)

    this.logger = pino({
      name: 'Payments',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true
        }
      }
    })

    if(!this.holderAddress) {
      this.logger.error('Holder address is empty. Set [BOT_ONE_HOLDER_ADDRESS] env variable.')
    }

    this.pollRates()
  }

  private async pollRates() {
    try {
      const { data } = await axios.get<CoinGeckoResponse>(
        `https://api.coingecko.com/api/v3/simple/price?ids=harmony&vs_currencies=usd`
      )
      this.ONERate = +data.harmony.usd
    } catch (e) {
      this.logger.error(`Cannot get ONE price: ${JSON.stringify(e)}`)
    } finally {
      await new Promise(resolve => setTimeout(resolve,  1000 * 60))
      this.pollRates()
    }
  }

  private getUserAccount(userId: number) {
    const privateKey = this.web3.utils.sha3(`${config.payment.secret}_${userId}`);
    if(privateKey) {
      return this.web3.eth.accounts.privateKeyToAccount(privateKey);
    }
  }

  public getPriceInONE(usdAmount: number) {
    const amount = this.ONERate ? Math.round(usdAmount / 100 / this.ONERate) : 0
    return bn(amount).multipliedBy(10 ** 18)
  }

  public toONE (amount: BigNumber, roundCeil = true) {
    const value = this.web3.utils.fromWei(amount.toString(), 'ether')
    if(roundCeil) {
      return Math.ceil(+value)
    }
    return +value
  }

  public async getAddressBalance(address: string) {
    const balance = await this.web3.eth.getBalance(address);
    return bn(balance.toString())
  }

  private async getUserBalance(userId: number) {
    const account = this.getUserAccount(userId)
    if(account) {
      const userBalance = await this.getAddressBalance(account.address)
      return userBalance
    }
    return bn(0)
  }

  private async getTransactionFee () {
    const gasPrice = await this.web3.eth.getGasPrice();
    return bn(gasPrice.toString()).multipliedBy(21000)
  }

  private async withdraw(account: Account, amountOne: BigNumber) {
    const web3 = new Web3(this.rpcURL)
    web3.eth.accounts.wallet.add(account)

    const gasPrice = await web3.eth.getGasPrice()
    const txBody = {
      from: account.address,
      to: this.holderAddress,
      value: web3.utils.toHex(amountOne.toString()),
    }
    const gasLimit = await web3.eth.estimateGas(txBody)
    const tx = await web3.eth.sendTransaction({
      ...txBody,
      gasPrice,
      gas: web3.utils.toHex(gasLimit),
    })
    return tx
  }

  public isUserInWhitelist(userId: number | string, username = '') {
    const { whitelist } = config.payment
    return whitelist.includes(userId.toString())
      || (username && whitelist.includes(username.toString().toLowerCase()))
  }

  public async pay(ctx: OnMessageContext, amountUSD: number) {
    const { from, message_id } = ctx.update.message
    const {  id: userId, username = '' } = from

    if(amountUSD === 0) {
      return true
    }

    if(this.isUserInWhitelist(userId, username)) {
      this.logger.info(`@${username} (${userId}) is in the whitelist, skip payment`)
      return true
    }

    if(this.ONERate === 0) {
      this.logger.warn(`ONE token rate is 0, skip payment`)
      return true
    }

    if(!this.holderAddress) {
      this.logger.warn(`Holder address is empty, payments is disabled`)
      return true
    }

    const userAccount = this.getUserAccount(userId)
    if(!userAccount) {
      ctx.reply(`Cannot get @${username}(${userId}) blockchain account`)
      return false
    }

    const priceONE = this.getPriceInONE(amountUSD)
    const fee = await this.getTransactionFee()
    const userBalance = await this.getUserBalance(userId)
    const requiredAmount = priceONE.plus(fee)
    const balanceDelta = userBalance.minus(requiredAmount)

    this.logger.info(`[${userId} @${username}] withdraw request, amount: ${amountUSD}$c (${priceONE.toString()} ONE), balance after withdraw: ${balanceDelta.toString()}`)

    if(balanceDelta.gte(0)) {
      try {
        const tx = await this.withdraw(userAccount, priceONE)
        this.logger.info(`[${userId} @${username}] withdraw successful, txHash: ${tx.transactionHash}, from: ${tx.from}, to: ${tx.to}`)
        return true
      } catch (e) {
        this.logger.error(`[${userId}] withdraw error: "${JSON.stringify((e as Error).message)}"`)
        ctx.reply(`Payment error (userId ${userId})`, {
          reply_to_message_id: message_id,
        })
      }
    } else {
      ctx.reply(`Insufficient balance\n\nSend *${this.toONE(balanceDelta.abs())} ONE* to \`${userAccount.address}\` and repeat the request.`, {
        reply_to_message_id: message_id,
        parse_mode: "Markdown",
      })
    }
    return false
  }

  public isSupportedEvent(ctx: OnMessageContext) {
    const { text = '' } = ctx.update.message
    return text?.toLowerCase() === '/balance' || text?.toLowerCase() === '/botfees'
  }

  public async onEvent(ctx: OnMessageContext) {
    const { id } = ctx.update.message.from
    const { message_id, text = '' } = ctx.update.message

    const account = this.getUserAccount(id)
    if(account && text.toLowerCase() === '/balance') {
      const balance = await this.getAddressBalance(account.address)
      const balanceOne = this.toONE(balance, false)
      ctx.reply(`Balance: *${balanceOne.toFixed(2)} ONE*\n\nDeposit address (Harmony Mainnet): \`${account.address}\``, {
        reply_to_message_id: message_id,
        parse_mode: "Markdown",
      });
    } else if(text.toLowerCase() === '/botfees') {
      const { holderAddress } = config.payment
      const balance = await this.getAddressBalance(holderAddress)
      const balanceOne = this.toONE(balance, false)
      ctx.reply(`Bot fees: *${balanceOne.toFixed(2)} ONE*\n\nBot address: \`${holderAddress}\``, {
        reply_to_message_id: message_id,
        parse_mode: "Markdown",
      });
    }
  }
}
