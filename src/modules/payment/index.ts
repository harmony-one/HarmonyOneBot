import pino, { Logger } from "pino";
import Web3 from "web3";
import { Account } from "web3-core";
import axios from "axios";
import bn, { BigNumber } from "bignumber.js";
import config from "../../config";
import { chatService, statsService } from "../../database/services";
import { OnMessageContext } from "../types";
import { LRUCache } from "lru-cache";
import {
  oneTokenFeeCounter,
  freeCreditsFeeCounter,
} from "../../metrics/prometheus";
import { BotPaymentLog } from "../../database/stats.service";
import { sendMessage } from "../open-ai/helpers";

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
  private ONERateUpdateTimestamp = 0;
  private rpcURL: string = "https://api.harmony.one";
  private lastPaymentTimestamp = 0;
  private noncePending = new LRUCache<string, number>({
    max: 1000,
    ttl: 30 * 1000,
  });

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

    this.getOneRate();
  }

  private async getOneRate() {
    if (
      this.ONERate &&
      Date.now() - this.ONERateUpdateTimestamp < 10 * 60 * 1000
    ) {
      return this.ONERate;
    }

    let oneRate = 0;
    try {
      const { data } = await axios.get<CoinGeckoResponse>(
        `https://api.coingecko.com/api/v3/simple/price?ids=harmony&vs_currencies=usd`
      );
      oneRate = +data.harmony.usd;
    } catch (e) {
      this.logger.error(
        `Cannot get ONE rates: ${JSON.stringify((e as Error).message)}`
      );
    }
    this.ONERate = oneRate;
    this.ONERateUpdateTimestamp = Date.now();
    return this.ONERate;
  }

  public getUserAccount(
    userId: number | string,
    botSecret = config.payment.secret
  ) {
    const privateKey = this.web3.utils.sha3(`${botSecret}_${userId}`);
    if (privateKey) {
      return this.web3.eth.accounts.privateKeyToAccount(privateKey);
    }
  }

  public async getPriceInONE(centsUsd: number) {
    const currentRate = await this.getOneRate();
    const amount = currentRate ? centsUsd / 100 / currentRate : 0;
    return bn(Math.round(amount * 10 ** 18));
  }

  public toONE(amount: BigNumber, roundCeil = true) {
    const value = this.web3.utils.fromWei(amount.toFixed(0), "ether");
    if (roundCeil) {
      return Math.ceil(+value);
    }
    return +value;
  }

  public async getAddressBalance(address: string) {
    const balance = await this.web3.eth.getBalance(address);
    return bn(balance.toString());
  }

  public async getUserBalance(accountId: number) {
    const account = this.getUserAccount(accountId);
    if (account) {
      const addressBalance = await this.getAddressBalance(account.address);
      return addressBalance;
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
    try {
      const web3 = new Web3(this.rpcURL);
      web3.eth.accounts.wallet.add(accountFrom);

      const gasPrice = await web3.eth.getGasPrice();

      let nonce = undefined;
      const nonceCache = this.noncePending.get(accountFrom.address);
      if (nonceCache) {
        nonce = nonceCache + 1;
      } else {
        nonce = await web3.eth.getTransactionCount(accountFrom.address);
      }
      this.noncePending.set(accountFrom.address, nonce);

      const txBody = {
        from: accountFrom.address,
        to: addressTo,
        value: web3.utils.toHex(amount.toFixed()),
        nonce,
      };
      const gasLimit = await web3.eth.estimateGas(txBody);
      const tx = await web3.eth.sendTransaction({
        ...txBody,
        gasPrice,
        gas: web3.utils.toHex(gasLimit),
      });
      return tx;
    } catch (e) {
      const message = (e as Error).message || "";
      if (
        message &&
        (message.includes("replacement transaction underpriced") ||
          message.includes("was not mined within") ||
          message.includes("Failed to check for transaction receipt"))
      ) {
        // skip this error
        this.logger.warn(`Skip error: ${message}`);
      } else {
        throw new Error(message);
      }
    }
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

    const accountId = this.getAccountId(ctx);
    const userAccount = this.getUserAccount(accountId);
    if (userAccount) {
      const amountONE = await this.getPriceInONE(amountUSD);
      const fee = await this.getTransactionFee();
      try {
        const tx = await this.transferFunds(
          this.hotWallet,
          userAccount.address,
          amountONE.minus(fee)
        );
        if (tx) {
          this.logger.info(
            `[${userId} @${username}] refund successful, from: ${
              tx.from
            }, to: ${tx.to}, amount ONE: ${amountONE.toFixed()}, txHash: ${
              tx.transactionHash
            }`
          );
        }
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

  private convertBigNumber(value: BigNumber, precision = 8) {
    return +value.div(BigNumber(10).pow(18)).toFormat(precision);
  }

  private async writePaymentLog(
    ctx: OnMessageContext,
    amountCredits: BigNumber,
    amountOne: BigNumber
  ) {
    const { from, text = "", audio, voice = "", chat } = ctx.update.message;

    try {
      const accountId = this.getAccountId(ctx);
      let [command = ""] = text.split(" ");
      if (!command) {
        if (audio || voice) {
          command = "/voice-memo";
        } else {
          command = "/openai";
        }
      }

      const log: BotPaymentLog = {
        tgUserId: from.id,
        accountId,
        groupId: chat.id,
        isPrivate: chat.type === "private",
        command,
        message: text || "",
        isSupportedCommand: true,
        amountCredits: this.convertBigNumber(amountCredits),
        amountOne: this.convertBigNumber(amountOne),
      };
      await statsService.writeLog(log);
    } catch (e) {
      this.logger.error(
        `Cannot write payments log: ${JSON.stringify((e as Error).message)}`
      );
    }
  }

  public async pay(ctx: OnMessageContext, amountUSD: number) {
    const { from, message_id, chat, text } = ctx.update.message;

    const accountId = this.getAccountId(ctx);
    const userAccount = this.getUserAccount(accountId);
    if (!userAccount) {
      sendMessage(
        ctx,
        `Cannot get @${from.username}(${from.id}) blockchain account`
      );
      return false;
    }

    if (Date.now() - this.lastPaymentTimestamp > 60 * 1000) {
      await this.withdrawHotWalletFunds();
    }

    this.logger.info(
      `Pay event @${from.username}(${from.id}) in chat ${chat.id} (${chat.type}), accountId: ${accountId}, account address: ${userAccount.address}`
    );

    let amountToPay = await this.getPriceInONE(amountUSD);
    const fee = await this.getTransactionFee();
    amountToPay = amountToPay.plus(fee);
    const balance = await this.getUserBalance(accountId);
    const credits = await chatService.getBalance(accountId);
    const balanceWithCredits = balance.plus(credits);
    const balanceDelta = balanceWithCredits.minus(amountToPay);

    const creditsPayAmount = bn.min(amountToPay, credits);
    const oneTokensPayAmount = amountToPay.minus(creditsPayAmount);

    if (this.skipPayment(ctx, amountUSD)) {
      await this.writePaymentLog(ctx, BigNumber(0), BigNumber(0));
      return true;
    }

    this.logger.info(
      `[@${
        from.username
      }] credits: ${credits.toFixed()}, ONE balance: ${balance.toFixed()}, to withdraw: ${amountToPay.toFixed()}, balance after: ${balanceDelta.toFixed()}`
    );
    if (balanceDelta.gte(0)) {
      if (amountToPay.gt(0) && credits.gt(0)) {
        await chatService.withdrawAmount(accountId, creditsPayAmount.toFixed());
        amountToPay = amountToPay.minus(creditsPayAmount);
        freeCreditsFeeCounter.inc(this.convertBigNumber(creditsPayAmount));
        this.logger.info(
          `[@${
            from.username
          }] paid from credits: ${creditsPayAmount.toFixed()}, left to pay: ${amountToPay.toFixed()}`
        );
      }
      if (amountToPay.gt(0)) {
        try {
          const tx = await this.transferFunds(
            userAccount,
            this.hotWallet.address,
            amountToPay
          );
          this.lastPaymentTimestamp = Date.now();
          if (tx) {
            oneTokenFeeCounter.inc(this.convertBigNumber(amountToPay));
            this.logger.info(
              `[${from.id} @${from.username}] withdraw successful, txHash: ${
                tx.transactionHash
              }, from: ${tx.from}, to: ${
                tx.to
              }, amount ONE: ${amountToPay.toString()}`
            );
          }
        } catch (e) {
          this.logger.error(
            `[${from.id}] withdraw error: "${JSON.stringify(
              (e as Error).message
            )}"`
          );
          sendMessage(ctx, "Payment error, try again later", {
            parseMode: "Markdown",
            replyId: message_id,
          });
        }
      }
      await this.writePaymentLog(ctx, creditsPayAmount, oneTokensPayAmount);
      return true;
    } else {
      const addressBalance = await this.getAddressBalance(userAccount.address);
      const creditsBalance = await chatService.getBalance(accountId);
      const balance = addressBalance.plus(creditsBalance);
      const balanceOne = this.toONE(balance, false).toFixed(2);
      sendMessage(
        ctx,
        `Your credits: ${balanceOne} ONE tokens. To recharge, send to \`${userAccount.address}\`.`,
        {
          parseMode: "Markdown",
          replyId: message_id,
        }
      );
    }
  }

  private async migrateFunds(accountId: number): Promise<BigNumber> {
    let totalFunds = bn(0);
    const currentAccount = this.getUserAccount(accountId);
    if (!currentAccount) {
      return totalFunds;
    }
    const fee = await this.getTransactionFee();

    const { prevSecretKeys } = config.payment;

    for (let i = 0; i < prevSecretKeys.length; i++) {
      const expiredSecretKey = prevSecretKeys[i];
      const prevAccount = this.getUserAccount(accountId, expiredSecretKey);
      if (prevAccount) {
        const balance = await this.getAddressBalance(prevAccount.address);
        const availableFunds = balance.minus(fee);
        if (availableFunds.gt(0)) {
          await this.transferFunds(
            prevAccount,
            currentAccount.address,
            availableFunds
          );
          this.logger.info(
            `accountId ${accountId} ${availableFunds.toFixed()} ONE transferred from ${
              prevAccount.address
            } to ${currentAccount.address}`
          );
          totalFunds = totalFunds.plus(availableFunds);
        }
      }
    }
    return totalFunds;
  }

  public isSupportedEvent(ctx: OnMessageContext) {
    const { text = "" } = ctx.update.message;
    return ["/credits", "/migrate"].includes(text);
  }

  public getAccountId(ctx: OnMessageContext) {
    const { chat, from } = ctx.update.message;
    const { id: userId } = from;
    const { id: chatId, type } = chat;
    return type === "private" ? userId : chatId;
  }

  public async onEvent(ctx: OnMessageContext) {
    const { text = "", from, chat } = ctx.update.message;

    if (!this.isSupportedEvent(ctx)) {
      return false;
    }
    const accountId = this.getAccountId(ctx);
    const account = this.getUserAccount(accountId);
    this.logger.info(
      `onEvent @${from.username}(${from.id}) in chat ${chat.id} (${chat.type}), accountId: ${accountId}, account address: ${account?.address}`
    );

    if (!account) {
      return false;
    }
    if (text === "/credits") {
      try {
        const freeCredits = await chatService.getBalance(accountId);
        const addressBalance = await this.getAddressBalance(account.address);
        const balance = addressBalance.plus(freeCredits);
        const balanceOne = this.toONE(balance, false);
        sendMessage(
          ctx,
          `Your credits in ONE tokens: ${balanceOne.toFixed(2)}

To recharge: \`${account.address}\``,
          {
            parseMode: "Markdown",
          }
        );
      } catch (e) {
        this.logger.error(e);
        sendMessage(ctx, `Error retrieving credits`);
      }
    } else if (text === "/migrate") {
      const amount = await this.migrateFunds(accountId);
      const balance = await this.getAddressBalance(account.address);
      const balanceOne = this.toONE(balance, false);
      let replyText = "";
      if (amount.gt(0)) {
        replyText = `Transferred ${this.toONE(amount, false).toFixed(
          2
        )} ONE from previous accounts to ${
          account.address
        }\n\nCurrent credits: ${balanceOne.toFixed(2)} ONE`;
      } else {
        replyText = `No funds were found in the credits of previous accounts\n\nCurrent credits: ${balanceOne.toFixed(
          2
        )} ONE`;
      }
      sendMessage(ctx, replyText, {
        parseMode: "Markdown",
      });
    }
  }

  private sleep = (timeout: number) =>
    new Promise((resolve) => setTimeout(resolve, timeout));

  private async withdrawHotWalletFunds() {
    try {
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
    } catch (e) {
      this.logger.error(
        `Cannot withdraw hot wallet funds: ${(e as Error).message}`
      );
    }
  }
}
