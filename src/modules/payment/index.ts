import pino, { type Logger } from 'pino'
import Web3 from 'web3'
import { type Account, type TransactionReceipt } from 'web3-core'
import axios from 'axios'
import bn, { BigNumber } from 'bignumber.js'
import config from '../../config'
import { chatService, invoiceService, statsService } from '../../database/services'
import { type OnCallBackQueryData, type OnMessageContext } from '../types'
import { LRUCache } from 'lru-cache'
import { freeCreditsFeeCounter } from '../../metrics/prometheus'
import { type BotPaymentLog } from '../../database/stats.service'
import { sendMessage } from '../open-ai/helpers'
import { type InvoiceParams } from '../../database/invoice.service'
import * as Sentry from '@sentry/node'

interface CoinGeckoResponse {
  harmony: {
    usd: string
  }
}

export class BotPayments {
  private readonly holderAddress = config.payment.holderAddress
  private readonly logger: Logger
  private readonly web3: Web3
  private ONERate: number = 0
  private ONERateUpdateTimestamp = 0
  private readonly rpcURL: string = 'https://api.harmony.one'
  private readonly noncePending = new LRUCache<string, number>({
    max: 1000,
    ttl: 30 * 1000
  })

  constructor () {
    this.web3 = new Web3(this.rpcURL)

    this.logger = pino({
      name: 'Payments',
      transport: {
        target: 'pino-pretty',
        options: { colorize: true }
      }
    })

    if (!this.holderAddress) {
      this.logger.warn(
        'Holder address is empty. Set [PAYMENT_HOLDER_ADDRESS] env variable.'
      )
    } else {
      this.logger.info(`Payments holder address: ${this.holderAddress}`)
    }
  }

  public bootstrap (): void {
    this.runHotWalletsTask().catch(e => {
      Sentry.captureException(e)
    })
    this.getOneRate().catch(e => {
      Sentry.captureException(e)
    })
  }

  private async transferUserFundsToHolder (
    accountId: number,
    userAccount: Account,
    amount: BigNumber
  ): Promise<void> {
    const invoiceData: InvoiceParams = {
      tgUserId: accountId,
      accountId,
      amount: Math.round(this.convertBigNumber(amount)),
      itemId: 'deposit_one',
      currency: 'ONE'
    }
    const invoice = await invoiceService.create(invoiceData)
    await this.transferFunds(userAccount, this.holderAddress, amount)
    await chatService.depositOneCredits(accountId, amount.toFixed())
    await invoiceService.setSuccessStatus({ uuid: invoice.uuid, providerPaymentChargeId: '', telegramPaymentChargeId: '' })
  }

  private async runHotWalletsTask (): Promise<void> {
    while (true) {
      try {
        await this.checkHotWallets()
      } catch (e) {
        Sentry.captureException(e)
      }
      await new Promise(resolve => setTimeout(resolve, 60 * 1000))
    }
  }

  private async checkHotWallets (): Promise<void> {
    let accounts: Array<{ accountId: string }> = []
    try {
      accounts = await statsService.getLastInteractingAccounts(24)
    } catch (e) {
      Sentry.captureException(e)
      this.logger.error(`Cannot get last interacted accounts: ${(e as Error).message}`)
    }

    const txFee = await this.getTransactionFee()

    for (const acc of accounts) {
      const accountId = +acc.accountId
      const userAccount = this.getUserAccount(accountId)
      if (userAccount) {
        let availableBalance = new BigNumber(0)
        try {
          availableBalance = await this.getUserBalance(accountId)
          // availableBalance = BigNumber.max(availableBalance.minus(txFee), 0)
        } catch (e) {
          Sentry.captureException(e)
          this.logger.error(`Cannot get user balance ${accountId} ${userAccount.address}`)
        }

        if (availableBalance.minus(txFee).gt(0)) {
          try {
            this.logger.info(`User ${accountId} ${userAccount.address} transfer funds ${availableBalance.toFixed()} ONE to multisig wallet: ${this.holderAddress}...`)
            await this.transferUserFundsToHolder(accountId, userAccount, availableBalance)
            const { totalCreditsAmount } = await chatService.getUserCredits(accountId)
            this.logger.info(`User ${accountId} ${userAccount.address} hot wallet funds "${availableBalance.toFixed()}" ONE transferred to holder address ${this.holderAddress}. ONE credits balance: ${totalCreditsAmount.toString()}.`)
          } catch (e) {
            Sentry.captureException(e)
            this.logger.error(
              `Cannot transfer user "${userAccount.address}" funds to holder "${this.holderAddress}": ${(e as Error).message}`
            )
          }
        }
      } else {
        this.logger.error(`Cannot get account with id "${accountId}"`)
      }
    }
  }

  private async getOneRate (): Promise<number> {
    if (
      this.ONERate &&
      Date.now() - this.ONERateUpdateTimestamp < 10 * 60 * 1000
    ) {
      return this.ONERate
    }

    let oneRate = 0
    try {
      const { data } = await axios.get<CoinGeckoResponse>(
        'https://api.coingecko.com/api/v3/simple/price?ids=harmony&vs_currencies=usd'
      )
      oneRate = +data.harmony.usd
    } catch (e) {
      Sentry.captureException(e)
      this.logger.error(
        `Cannot get ONE rates: ${JSON.stringify((e as Error).message)}`
      )
    }
    this.ONERate = oneRate
    this.ONERateUpdateTimestamp = Date.now()
    this.logger.info(`Updated ONE token rate: ${oneRate}`)
    return oneRate
  }

  public getUserAccount (
    userId: number | string,
    botSecret = config.payment.secret
  ): Account | undefined {
    const privateKey = this.web3.utils.sha3(`${botSecret}_${userId}`)
    if (privateKey) {
      return this.web3.eth.accounts.privateKeyToAccount(privateKey)
    }
  }

  public async getPriceInONE (centsUsd: number): Promise<bn> {
    const currentRate = await this.getOneRate()
    const amount = currentRate ? centsUsd / 100 / currentRate : 0
    return bn(Math.round(amount * 10 ** 18))
  }

  public toONE (amount: BigNumber, roundCeil = true): number {
    const value = this.web3.utils.fromWei(amount.toFixed(0), 'ether')
    if (roundCeil) {
      return Math.ceil(+value)
    }
    return +value
  }

  public async getAddressBalance (address: string): Promise<bn> {
    const balance = await this.web3.eth.getBalance(address)
    return bn(balance.toString())
  }

  public async getUserBalance (accountId: number): Promise<bn> {
    const account = this.getUserAccount(accountId)
    if (account) {
      return await this.getAddressBalance(account.address)
    }
    return bn(0)
  }

  private async getTransactionFee (): Promise<bn> {
    const estimatedFee = await this.estimateTransferFee()
    return bn(estimatedFee)
  }

  private async estimateTransferFee() {
    const web3 = new Web3(this.rpcURL)
    const gasPrice = await web3.eth.getGasPrice()
    const txBody = {
      from: this.holderAddress,
      to: this.holderAddress,
      value: web3.utils.toHex('0'),
    }
    const estimatedGas = await web3.eth.estimateGas(txBody)
    return estimatedGas * +gasPrice
  }

  private async transferFunds (
    accountFrom: Account,
    addressTo: string,
    amount: BigNumber
  ): Promise<TransactionReceipt | undefined> {
    try {
      const web3 = new Web3(this.rpcURL)
      web3.eth.accounts.wallet.add(accountFrom)

      const gasPrice = await web3.eth.getGasPrice()

      let nonce
      const nonceCache = this.noncePending.get(accountFrom.address)
      if (nonceCache) {
        nonce = nonceCache + 1
      } else {
        nonce = await web3.eth.getTransactionCount(accountFrom.address)
      }
      this.noncePending.set(accountFrom.address, nonce)

      const txBody = {
        from: accountFrom.address,
        to: addressTo,
        value: web3.utils.toHex(amount.toFixed()),
        nonce
      }
      const estimatedGas = await web3.eth.estimateGas(txBody)
      const gasValue = estimatedGas * +gasPrice
      const txValue = amount.minus(BigNumber(gasValue)).toFixed()

      return await web3.eth.sendTransaction({
        ...txBody,
        gasPrice,
        gas: web3.utils.toHex(estimatedGas),
        value: web3.utils.toHex(txValue)
      })
    } catch (e) {
      Sentry.captureException(e)
      const message = (e as Error).message || ''
      if (
        message &&
        (message.includes('replacement transaction underpriced') ||
          message.includes('was not mined within') ||
          message.includes('Failed to check for transaction receipt'))
      ) {
        // skip this error
        this.logger.warn(`Skip error: ${message}`)
      } else {
        throw new Error(message)
      }
    }
  }

  public isUserInWhitelist (userId: number | string, username = ''): boolean {
    const { whitelist } = config.payment
    return (
      whitelist.includes(userId.toString()) ||
      (!!username && whitelist.includes(username.toString().toLowerCase()))
    )
  }

  public isPaymentsEnabled (): boolean {
    return Boolean(
      config.payment.isEnabled &&
        config.payment.secret &&
        config.payment.holderAddress
    )
  }

  private skipPayment (ctx: OnMessageContext, amountUSD: number): boolean {
    const { id: userId, username = '' } = ctx.update.message.from

    if (!this.isPaymentsEnabled()) {
      return true
    }
    if (amountUSD === 0) {
      return true
    }
    if (this.isUserInWhitelist(userId, username)) {
      this.logger.info(
        `@${username} (${userId}) is in the whitelist, skip payment`
      )
      return true
    }

    if (this.ONERate === 0) {
      this.logger.error('ONE token rate is 0, skip payment')
      return true
    }

    return false
  }

  private convertBigNumber (value: BigNumber, precision = 8): number {
    return +value.div(BigNumber(10).pow(18)).toFormat(precision)
  }

  private async writePaymentLog (
    ctx: OnMessageContext,
    amountCredits: BigNumber
  ): Promise<void> {
    const { from, text = '', audio, voice = '', chat } = ctx.update.message

    try {
      const accountId = this.getAccountId(ctx)
      let [command = ''] = text.split(' ')
      if (!command) {
        if (audio ?? voice) {
          command = '/voice-memo'
        } else {
          command = '/openai'
        }
      }

      const log: BotPaymentLog = {
        tgUserId: from.id,
        accountId,
        groupId: chat.id,
        isPrivate: chat.type === 'private',
        command,
        message: text || '',
        isSupportedCommand: true,
        amountCredits: this.convertBigNumber(amountCredits),
        // TODO: remove fields from DB
        amountOne: 0,
        amountFiatCredits: 0
      }
      await statsService.writeLog(log)
    } catch (e) {
      Sentry.captureException(e)
      this.logger.error(
        `Cannot write payments log: ${JSON.stringify((e as Error).message)}`
      )
    }
  }

  public async rent (ctx: OnMessageContext, domainName: string): Promise<boolean> {
    return true
  }

  public async pay (ctx: OnMessageContext, amountUSD: number): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { from, message_id, chat } = ctx.update.message

    const accountId = this.getAccountId(ctx)
    const userAccount = this.getUserAccount(accountId)
    if (!userAccount) {
      await sendMessage(
        ctx,
        `Cannot get @${from.username}(${from.id}) blockchain account`
      )
      return false
    }

    this.logger.info(
      `Payment requested @${from.username}(${from.id}) in chat ${chat.id} (${chat.type}), accountId: ${accountId}, account address: ${userAccount.address}`
    )

    if (this.skipPayment(ctx, amountUSD)) {
      await this.writePaymentLog(ctx, BigNumber(0))
      return true
    }

    const userBalance = await this.getUserBalance(accountId)
    if (userBalance.gt(0)) {
      const fee = await this.getTransactionFee()
      if (userBalance.minus(fee).gt(0)) {
        this.logger.info(`Found user with ONE balance. Start transferring ${userBalance.toString()} ONE to holder address ${this.holderAddress}...`)
        await this.transferUserFundsToHolder(accountId, userAccount, userBalance)
        this.logger.info(`Funds transferred from ${accountId} ${userAccount.address} to holder address ${this.holderAddress}, amount: ${userBalance.toString()}`)
      }
    }

    const totalPayAmount = await this.getPriceInONE(amountUSD)
    const { totalCreditsAmount } = await chatService.getUserCredits(accountId)
    const totalBalanceDelta = totalCreditsAmount.minus(totalPayAmount)

    this.logger.info(
      `[${from.id} @${
        from.username
      }] credits total: ${totalCreditsAmount.toFixed()}, to withdraw: ${totalPayAmount.toFixed()}, total balance after: ${totalBalanceDelta.toFixed()}`
    )

    if (totalBalanceDelta.gte(0)) {
      const balanceAfter = await chatService.withdrawCredits(accountId, totalPayAmount)
      this.logger.info(`[${from.id} @${
        from.username
      }] successfully paid from credits, credits balance after: ${balanceAfter.totalCreditsAmount}`)

      freeCreditsFeeCounter.inc(this.convertBigNumber(totalPayAmount))
      await this.writePaymentLog(ctx, totalPayAmount)
      return true
    } else {
      const oneBalance = await this.getAddressBalance(userAccount.address)
      const { totalCreditsAmount } = await chatService.getUserCredits(accountId)
      const totalBalance = oneBalance.plus(totalCreditsAmount)
      const creditsFormatted = this.toONE(totalBalance, false).toFixed(2)
      await sendMessage(ctx,
        `Your credits: ${creditsFormatted} ONE tokens. To recharge, send to \`${userAccount.address}\`.`,
        {
          parseMode: 'Markdown',
          replyId: message_id
        }
      )
      return false
    }
  }

  private async migrateFunds (accountId: number): Promise<BigNumber> {
    let totalFunds = bn(0)
    const currentAccount = this.getUserAccount(accountId)
    if (!currentAccount) {
      return totalFunds
    }
    const fee = await this.getTransactionFee()

    const { prevSecretKeys } = config.payment

    for (let i = 0; i < prevSecretKeys.length; i++) {
      const expiredSecretKey = prevSecretKeys[i]
      const prevAccount = this.getUserAccount(accountId, expiredSecretKey)
      if (prevAccount) {
        const balance = await this.getAddressBalance(prevAccount.address)
        const availableFunds = balance.minus(fee)
        if (availableFunds.gt(0)) {
          await this.transferFunds(
            prevAccount,
            currentAccount.address,
            availableFunds
          )
          this.logger.info(
            `accountId ${accountId} ${availableFunds.toFixed()} ONE transferred from ${
              prevAccount.address
            } to ${currentAccount.address}`
          )
          totalFunds = totalFunds.plus(availableFunds)
        }
      }
    }
    return totalFunds
  }

  public isSupportedEvent (ctx: OnMessageContext): boolean {
    const { text = '' } = ctx.update.message
    return ['/credits', '/migrate'].includes(text)
  }

  public getAccountId (ctx: OnMessageContext | OnCallBackQueryData): number {
    if (ctx.callbackQuery?.message) {
      const { from } = ctx.callbackQuery
      const { chat } = ctx.callbackQuery.message
      const { id: userId } = from
      const { id: chatId, type } = chat
      return type === 'private' && userId ? userId : chatId
    }

    if (ctx.update.message) {
      const { chat, from } = ctx.update.message
      const { id: userId } = from
      const { id: chatId, type } = chat
      return type === 'private' ? userId : chatId
    }

    throw new Error('Couldn\'t get account ID.')
  }

  public async onEvent (ctx: OnMessageContext): Promise<void> {
    const { text = '', from, chat } = ctx.update.message

    if (!this.isSupportedEvent(ctx)) {
      return
    }
    const accountId = this.getAccountId(ctx)
    const account = this.getUserAccount(accountId)
    this.logger.info(
      `onEvent @${from.username}(${from.id}) in chat ${chat.id} (${chat.type}), accountId: ${accountId}, account address: ${account?.address}`
    )

    if (!account) {
      return
    }
    if (text === '/credits') {
      try {
        const { totalCreditsAmount } = await chatService.getUserCredits(accountId)
        const addressBalance = await this.getAddressBalance(account.address)
        const balanceTotal = totalCreditsAmount.plus(addressBalance)
        const balanceFormatted = this.toONE(balanceTotal, false)
        await sendMessage(
          ctx,
          `Your 1Bot credits in ONE tokens: ${balanceFormatted.toFixed(2)}

To recharge, send to: \`${account.address}\`. Buy tokens on harmony.one/buy.`,
          {
            parseMode: 'Markdown',
            disable_web_page_preview: true
          }
        )
      } catch (e) {
        Sentry.captureException(e)
        this.logger.error(e)
        await sendMessage(ctx, 'Error retrieving credits')
      }
    } else if (text === '/migrate') {
      const amount = await this.migrateFunds(accountId)
      const balance = await this.getAddressBalance(account.address)
      const balanceOne = this.toONE(balance, false)
      let replyText: string
      if (amount.gt(0)) {
        replyText = `Transferred ${this.toONE(amount, false).toFixed(
          2
        )} ONE from previous accounts to ${
          account.address
        }\n\nCurrent credits: ${balanceOne.toFixed(2)} ONE`
      } else {
        replyText = `No funds were found in the credits of previous accounts\n\nCurrent credits: ${balanceOne.toFixed(
          2
        )} ONE`
      }
      await sendMessage(ctx, replyText, { parseMode: 'Markdown' })
    }
  }
}
