import pino, { Logger } from "pino";
import Web3 from "web3";
import { Account } from "web3-core";
import axios from "axios";
import bn, { BigNumber } from "bignumber.js";
import config from "../../config";
import { OnCallBackQueryData, OnMessageContext } from "../types";

interface CoinGeckoResponse {
  harmony: {
    usd: string;
  };
}

export class BotPayments {
  private readonly hotWallet: Account;
  private readonly holderAddress = config.payment.holderAddress;
  private logger: Logger;
  private web3: Web3;
  private ONERate: number = 0;
  private rpcURL: string = "https://api.harmony.one";
  private lastPaymentTimestamp = 0;

  constructor() {
    this.web3 = new Web3(this.rpcURL);

    this.logger = pino({
      name: "Payments",
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
        },
      },
    });

    if (!this.holderAddress) {
      this.logger.warn(
        "Holder address is empty. Set [PAYMENT_HOLDER_ADDRESS] env variable."
      );
    } else {
      this.logger.info(`Payments holder address: ${this.holderAddress}`);
    }

    this.hotWallet = this.getUserAccount("hot_wallet") as Account;
    this.logger.info(`Hot wallet address: ${this.hotWallet.address}`);

    this.pollRates();
    this.runIntervalCheck();
  }

  private async pollRates() {
    try {
      const { data } = await axios.get<CoinGeckoResponse>(
        `https://api.coingecko.com/api/v3/simple/price?ids=harmony&vs_currencies=usd`
      );
      this.ONERate = +data.harmony.usd;
    } catch (e) {
      this.logger.error(`Cannot get ONE price: ${JSON.stringify(e)}`);
    } finally {
      await this.sleep(1000 * 60);
      this.pollRates();
    }
  }

  public getUserAccount(userId: number | string, botSecret = config.payment.secret) {
    const privateKey = this.web3.utils.sha3(
      `${botSecret}_${userId}`
    );
    if (privateKey) {
      return this.web3.eth.accounts.privateKeyToAccount(privateKey);
    }
  }

  public getPriceInONE(usdAmount: number) {
    const amount = this.ONERate
      ? Math.round(usdAmount / 100 / this.ONERate)
      : 0;
    return bn(amount).multipliedBy(10 ** 18);
  }

  public toONE(amount: BigNumber, roundCeil = true) {
    const value = this.web3.utils.fromWei(amount.toFixed(), 'ether')
    if(roundCeil) {
      return Math.ceil(+value)
    }
    return +value
  }

  public async getAddressBalance(address: string) {
    const balance = await this.web3.eth.getBalance(address);
    return bn(balance.toString());
  }

  public async getUserBalance(accountId: number) {
    const account = this.getUserAccount(accountId);
    if (account) {
      return await this.getAddressBalance(account.address);
    }
    return bn(0);
  }

  private async getTransactionFee() {
    const gasPrice = await this.web3.eth.getGasPrice();
    return bn(gasPrice.toString()).multipliedBy(35000);
  }

  private async transferFunds(
    accountFrom: Account,
    addressTo: string,
    amount: BigNumber
  ) {
    const web3 = new Web3(this.rpcURL);
    web3.eth.accounts.wallet.add(accountFrom);

    const gasPrice = await web3.eth.getGasPrice();
    const txBody = {
      from: accountFrom.address,
      to: addressTo,
      value: web3.utils.toHex(amount.toFixed()),
    };
    const gasLimit = await web3.eth.estimateGas(txBody);
    const tx = await web3.eth.sendTransaction({
      ...txBody,
      gasPrice,
      gas: web3.utils.toHex(gasLimit),
    });
    return tx;
  }

  public isUserInWhitelist(userId: number | string, username = "") {
    const { whitelist } = config.payment;
    return (
      whitelist.includes(userId.toString()) ||
      (username && whitelist.includes(username.toString().toLowerCase()))
    );
  }

  public isPaymentsEnabled() {
    return Boolean(
      config.payment.isEnabled &&
        config.payment.secret &&
        config.payment.holderAddress
    );
  }

  private skipPayment(ctx: OnMessageContext, amountUSD: number) {
    const { id: userId, username = "" } = ctx.update.message.from;

    if (!this.isPaymentsEnabled()) {
      return true;
    }
    if (amountUSD === 0) {
      return true;
    }
    if (this.isUserInWhitelist(userId, username)) {
      this.logger.info(
        `@${username} (${userId}) is in the whitelist, skip payment`
      );
      return true;
    }

    if (this.ONERate === 0) {
      this.logger.warn(`ONE token rate is 0, skip payment`);
      return true;
    }

    return false;
  }

  public async refundPayment(
    reason = "",
    ctx: OnMessageContext,
    amountUSD: number
  ) {
    const { id: userId, username = "" } = ctx.update.message.from;

    this.logger.error(
      `[${userId} @${username}] refund payment: $${amountUSD}, reason: "${reason}"`
    );

    if (this.skipPayment(ctx, amountUSD)) {
      this.logger.info(`[${userId} @${username}] skip refund`);
      return true;
    }

    const accountId = this.getAccountId(ctx)
    const userAccount = this.getUserAccount(accountId);
    if (userAccount) {
      const amountONE = this.getPriceInONE(amountUSD);
      const fee = await this.getTransactionFee();
      try {
        const tx = await this.transferFunds(
          this.hotWallet,
          userAccount.address,
          amountONE.minus(fee)
        );
        this.logger.info(
          `[${userId} @${username}] refund successful, from: ${tx.from}, to: ${
            tx.to
          }, amount ONE: ${amountONE.toFixed()}, txHash: ${tx.transactionHash}`
        );
        return true;
      } catch (e) {
        this.logger.error(
          `[${userId} @${username}] amountONE: ${amountONE.toFixed()} refund error : ${
            (e as Error).message
          }`
        );
      }
    }
  }

  public async pay(ctx: OnMessageContext, amountUSD: number) {
    const { from, message_id, chat } = ctx.update.message;

    if (this.skipPayment(ctx, amountUSD)) {
      return true;
    }
    const accountId = this.getAccountId(ctx)
    const userAccount = this.getUserAccount(accountId);
    if (!userAccount) {
      ctx.reply(`Cannot get @${from.username}(${from.id}) blockchain account`);
      return false;
    }

    this.logger.info(`Pay event @${from.username}(${from.id}) in chat ${chat.id} (${chat.type}), accountId: ${accountId}, account address: ${userAccount.address}`)

    const amountONE = this.getPriceInONE(amountUSD);
    const fee = await this.getTransactionFee();
    const userBalance = await this.getUserBalance(accountId);
    const balanceDelta = userBalance.minus(amountONE.plus(fee));

    this.logger.info(
      `[@${from.username} ${from.id}] withdraw request, amount: ${amountUSD}$c (${amountONE.toFixed()} ONE), credits after withdraw: ${balanceDelta.toFixed()}`
    );
    if (balanceDelta.gte(0)) {
      try {
        const tx = await this.transferFunds(
          userAccount,
          this.hotWallet.address,
          amountONE
        );
        this.lastPaymentTimestamp = Date.now();
        this.logger.info(
          `[${from.id} @${from.username}] withdraw successful, txHash: ${
            tx.transactionHash
          }, from: ${tx.from}, to: ${
            tx.to
          }, amount ONE: ${amountONE.toString()}`
        );
        return true;
      } catch (e) {
        this.logger.error(
          `[${from.id}] withdraw error: "${JSON.stringify(
            (e as Error).message
          )}"`
        );
        ctx.reply(`Payment error (${from.username})`, {
          reply_to_message_id: message_id,
        });
      }
    } else {
      const balance = await this.getAddressBalance(userAccount.address)
      const balanceOne  = this.toONE(balance, false).toFixed(2)
      ctx.reply(
        `Your credits: ${balanceOne} ONE tokens. To recharge, send to \`${userAccount.address}\`.`,
        {
          reply_to_message_id: message_id,
          parse_mode: "Markdown",
        }
      );
    }
  }

  private async migrateFunds(accountId: number): Promise<BigNumber> {
    let totalFunds = bn(0)
    const currentAccount = this.getUserAccount(accountId)
    if(!currentAccount) {
      return totalFunds
    }
    const fee = await this.getTransactionFee();

    const { prevSecretKeys } = config.payment

    for(let i = 0; i < prevSecretKeys.length; i++) {
      const expiredSecretKey = prevSecretKeys[i]
      const prevAccount = this.getUserAccount(accountId, expiredSecretKey);
      if(prevAccount) {
        const balance = await this.getAddressBalance(prevAccount.address)
        const availableFunds = balance.minus(fee)
        if(availableFunds.gt(0)) {
          await this.transferFunds(prevAccount, currentAccount.address, availableFunds)
          this.logger.info(`accountId ${accountId} ${availableFunds.toFixed()} ONE transferred from ${prevAccount.address} to ${currentAccount.address}`)
          totalFunds = totalFunds.plus(availableFunds)
        }
      }
    }
    return totalFunds
  }

  public isSupportedEvent(ctx: OnMessageContext) {
    const { text = '' } = ctx.update.message;
    return ['/secret', '/migrate'].includes(text)
  }

  private getAccountId(ctx: OnMessageContext) {
    const { chat, from } = ctx.update.message;
    const { id: userId } = from
    const { id: chatId, type } = chat
    return type === 'private'
      ? userId
      : chatId
  }

  public async onEvent(ctx: OnMessageContext) {
    const { text = '', from, chat } = ctx.update.message;

    if(!this.isSupportedEvent(ctx)) {
      return false
    }

    const accountId = this.getAccountId(ctx)
    const account = this.getUserAccount(accountId);

    this.logger.info(`onEvent @${from.username}(${from.id}) in chat ${chat.id} (${chat.type}), accountId: ${accountId}, account address: ${account?.address}`)

    if(!account) {
      return false
    }
    if (text === '/secret') {
      try {
        const balance = await this.getAddressBalance(account.address);
        const balanceOne = this.toONE(balance, false);
        ctx.reply(
          `
      🤖 *Credits* 
      
*ONE*: ${balanceOne.toFixed(2)} 

*Deposit Address*: \`${account.address}\``,
          {
            parse_mode: "Markdown",
          }
        );
      } catch (e) {
        this.logger.error(e);
        ctx.reply(`Error retrieving credits`);
      }
    } else if(text === '/migrate') {
      const amount = await this.migrateFunds(accountId)
      const balance = await this.getAddressBalance(account.address);
      const balanceOne  = this.toONE(balance, false)
      let replyText = ''
      if(amount.gt(0)) {
        replyText = `Transferred ${this.toONE(amount, false).toFixed(2)} ONE from previous accounts to ${account.address}\n\nCurrent credits: ${balanceOne.toFixed(2)} ONE`
      } else {
        replyText = `No funds were found in the credits of previous accounts\n\nCurrent credits: ${balanceOne.toFixed(2)} ONE`
      }
      ctx.reply(replyText, {
        parse_mode: "Markdown",
      })
    }
  }

  private sleep = (timeout: number) =>
    new Promise((resolve) => setTimeout(resolve, timeout));

  private async withdrawHotWalletFunds() {
    const hotWalletBalance = await this.getAddressBalance(
      this.hotWallet.address
    );
    const fee = await this.getTransactionFee();
    if (hotWalletBalance.gt(fee)) {
      await this.transferFunds(
        this.hotWallet,
        this.holderAddress,
        hotWalletBalance.minus(fee)
      );
      this.logger.info(
        `Hot wallet funds transferred from hot wallet ${
          this.hotWallet.address
        } to holder address: ${
          this.holderAddress
        }, amount: ${hotWalletBalance.toFixed()}`
      );
    } else {
      // this.logger.info(`Hot wallet ${this.hotWallet.address} balance is zero, skip withdrawal`)
    }
  }

  private async runIntervalCheck() {
    try {
      if (Date.now() - this.lastPaymentTimestamp > 10 * 60 * 1000) {
        await this.withdrawHotWalletFunds();
      }
    } catch (e) {
      this.logger.error(
        `Cannot withdraw funds from hot wallet ${
          this.hotWallet.address
        } to holder address ${this.holderAddress} :"${(e as Error).message}"`
      );
      await this.sleep(1000 * 60 * 10);
    } finally {
      await this.sleep(1000 * 60);
      this.runIntervalCheck();
    }
  }
}
