import pino, {Logger} from "pino";
import Web3, {Web3BaseWalletAccount} from 'web3'
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

  private async withdraw(account: Web3BaseWalletAccount, amountOne: BigNumber) {
    const { holderAddress } = config.payment

    const web3 = new Web3(this.rpcURL)
    web3.eth.accounts.wallet.add(account)

    const gasPrice = await web3.eth.getGasPrice()
    const tx = await web3.eth.sendTransaction({
      from: account.address,
      to: holderAddress,
      value: amountOne.toString(),
      gasPrice,
      gas: web3.utils.toHex(21000),
    })
    return tx
  }

  public async pay(ctx: OnMessageContext, amountUSD: number) {
    const { from, message_id } = ctx.update.message
    const {  id: userId, username } = from

    if(amountUSD === 0) {
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
        this.logger.error(`[${userId} @${username}] withdraw error: "${JSON.stringify((e as Error).message)}"`)
        ctx.reply(`Payment error (${userId} @${username})`, {
          reply_to_message_id: message_id,
        })
      }
    } else {
      ctx.reply(`Insufficient balance\nSend *${this.toONE(balanceDelta.abs())} ONE* to *${userAccount.address}* (Harmony Mainnet)`, {
        reply_to_message_id: message_id,
        parse_mode: "Markdown",
      })
    }
    return false
  }
}
