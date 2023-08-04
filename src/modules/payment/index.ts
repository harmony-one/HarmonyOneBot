import pino, {Logger} from "pino";
import Web3 from 'web3'
import {Account} from 'web3-core'
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
  private readonly hotWallet: Account
  private readonly holderAddress = config.payment.holderAddress
  private logger: Logger;
  private web3: Web3;
  private ONERate: number = 0
  private rpcURL: string = 'https://api.harmony.one'
  private lastPaymentTimestamp = 0

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
      this.logger.warn('Holder address is empty. Set [PAYMENT_HOLDER_ADDRESS] env variable.')
    } else {
      this.logger.info(`Payments holder address: ${this.holderAddress}`)
    }

    this.hotWallet = this.getUserAccount('hot_wallet') as Account
    this.logger.info(`Hot wallet address: ${this.hotWallet.address}`)

    this.pollRates()
    this.runIntervalCheck()
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
      await this.sleep(1000 * 60)
      this.pollRates()
    }
  }

  private getUserAccount(userId: number | string) {
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
      return await this.getAddressBalance(account.address)
    }
    return bn(0)
  }

  private async getTransactionFee () {
    const gasPrice = await this.web3.eth.getGasPrice();
    return bn(gasPrice.toString()).multipliedBy(35000)
  }

  private async transferFunds(accountFrom: Account, addressTo: string, amount: BigNumber) {
    const web3 = new Web3(this.rpcURL)
    web3.eth.accounts.wallet.add(accountFrom)

    const gasPrice = await web3.eth.getGasPrice()
    const txBody = {
      from: accountFrom.address,
      to: addressTo,
      value: web3.utils.toHex(amount.toString()),
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

  public isPaymentsEnabled() {
    return Boolean(config.payment.isEnabled && config.payment.secret && config.payment.holderAddress)
  }

  private skipPayment(ctx: OnMessageContext, amountUSD: number) {
    const {  id: userId, username = '' } = ctx.update.message.from

    if(!this.isPaymentsEnabled()) {
      return true
    }

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

    return false
  }

  public async refundPayment(e: Error, ctx: OnMessageContext, amountUSD: number) {
    const {  id: userId, username = '' } = ctx.update.message.from

    this.logger.error(`[${userId} @${username}] refund payment: $${amountUSD}, error from bot module: "${(e as Error).message}"`)

    if(this.skipPayment(ctx, amountUSD)) {
      this.logger.info(`[${userId} @${username}] skip refund`)
      return true
    }

    const userAccount = this.getUserAccount(userId)
    if(userAccount) {
      const amountONE = this.getPriceInONE(amountUSD)
      const fee = await this.getTransactionFee()
      try {
        const tx = await this.transferFunds(this.hotWallet, userAccount.address, amountONE.minus(fee))
        this.logger.info(`[${userId} @${username}] refund successful, from: ${tx.from}, to: ${tx.to}, amount ONE: ${amountONE.toString()}, txHash: ${tx.transactionHash}`)
        return true
      } catch (e) {
        this.logger.error(`[${userId} @${username}] amountONE: ${amountONE.toString()} refund error : ${(e as Error).message}`)
      }
    }

  }

  public async pay(ctx: OnMessageContext, amountUSD: number) {
    const { from, message_id } = ctx.update.message
    const {  id: userId, username = '' } = from

    if(this.skipPayment(ctx, amountUSD)) {
      return true
    }

    const userAccount = this.getUserAccount(userId)
    if(!userAccount) {
      ctx.reply(`Cannot get @${username}(${userId}) blockchain account`)
      return false
    }

    const amountONE = this.getPriceInONE(amountUSD)
    const fee = await this.getTransactionFee()
    const userBalance = await this.getUserBalance(userId)
    const balanceDelta = userBalance.minus(amountONE.plus(fee))

    this.logger.info(`[${userId} @${username}] withdraw request, amount: ${amountUSD}$c (${amountONE.toString()} ONE), balance after withdraw: ${balanceDelta.toString()}`)

    if(balanceDelta.gte(0)) {
      try {
        const tx = await this.transferFunds(userAccount, this.hotWallet.address, amountONE)
        this.lastPaymentTimestamp = Date.now()
        this.logger.info(`[${userId} @${username}] withdraw successful, txHash: ${tx.transactionHash}, from: ${tx.from}, to: ${tx.to}, amount ONE: ${amountONE.toString()}`)
        return true
      } catch (e) {
        this.logger.error(`[${userId}] withdraw error: "${JSON.stringify((e as Error).message)}"`)
        ctx.reply(`Payment error (${userId})`, {
          reply_to_message_id: message_id,
        })
      }
    } else {
      ctx.reply(`Insufficient balance\n\nSend *${this.toONE(balanceDelta.abs())} ONE* to \`${userAccount.address}\` and repeat the request.`, {
        reply_to_message_id: message_id,
        parse_mode: "Markdown",
      })
    }
  }

  public isSupportedEvent(ctx: OnMessageContext) {
    const { text = '' } = ctx.update.message
    return text?.toLowerCase() === '/balance'
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
    }
  }

  private sleep = (timeout: number) => new Promise(resolve => setTimeout(resolve,  timeout))

  private async withdrawHotWalletFunds() {
    const hotWalletBalance = await this.getAddressBalance(this.hotWallet.address)
    const fee = await this.getTransactionFee()
    if(hotWalletBalance.gt(fee)) {
      await this.transferFunds(this.hotWallet, this.holderAddress, hotWalletBalance.minus(fee))
      this.logger.info(`Hot wallet funds transferred from hot wallet ${this.hotWallet.address} to holder address: ${this.holderAddress}, amount: ${hotWalletBalance.toString()}`)
    } else {
      // this.logger.info(`Hot wallet ${this.hotWallet.address} balance is zero, skip withdrawal`)
    }
  }

  private async runIntervalCheck() {
    try {
      if(Date.now() - this.lastPaymentTimestamp > 10 * 60 * 1000) {
        await this.withdrawHotWalletFunds()
      }
    } catch (e) {
      this.logger.error(`Cannot withdraw funds from hot wallet ${this.hotWallet.address} to holder address ${this.holderAddress} :"${(e as Error).message}"`)
      await this.sleep(1000 * 60 * 10)
    } finally {
      await this.sleep(1000 * 60)
      this.runIntervalCheck()
    }
  }
}
