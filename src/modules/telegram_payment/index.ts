import {OnMessageContext, OnPreCheckoutContext, OnSuccessfullPayment} from "../types";
import {LabeledPrice} from "grammy/out/types";
import config from "../../config";
import {chatService, invoiceService} from "../../database/services";
import {BotPayments} from "../payment";
import pino, {Logger} from "pino";

enum SupportedCommands {
  DEPOSIT = 'deposit',
}

export class TelegramPayments {

  private payments: BotPayments;

  private logger: Logger;

  constructor(payments: BotPayments) {
    this.payments = payments;
    this.logger = pino({
      name: 'TelegramPayment',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true
        }
      }
    })
  }

  public isSupportedEvent(ctx: OnMessageContext) {
    return ctx.hasCommand(Object.values(SupportedCommands)) || ctx.has('message:successful_payment');
  }

  public async onEvent(ctx: OnMessageContext) {
    if (ctx.hasCommand(SupportedCommands.DEPOSIT)) {
      await this.createPaymentInvoice(ctx)
    }

    if (ctx.has('message:successful_payment')) {
      const successfulPayment = ctx.message.successful_payment
      if(successfulPayment) {
        return this.onSuccessfulPayment(ctx as OnSuccessfullPayment)
      }
    }
  }

  public async onPreCheckout(ctx: OnPreCheckoutContext) {
    const {uuid} = JSON.parse(ctx.preCheckoutQuery.invoice_payload) as {uuid: string};

    const invoice = await invoiceService.get(uuid);

    if (!invoice || invoice.status !== 'init') {
      return ctx.answerPreCheckoutQuery(false, {error_message: 'Outdated invoice'});
    }

    await ctx.answerPreCheckoutQuery(true)
  }

  async onSuccessfulPayment(ctx: OnSuccessfullPayment) {
    const {invoice_payload, telegram_payment_charge_id, provider_payment_charge_id} = ctx.message.successful_payment;

    const {uuid} = JSON.parse(invoice_payload) as {uuid: string};
    const telegramPaymentChargeId = telegram_payment_charge_id;
    const providerPaymentChargeId = provider_payment_charge_id;

    const invoice = await invoiceService.setSuccessStatus({uuid, telegramPaymentChargeId, providerPaymentChargeId});
    const fiatCredits = await this.payments.getPriceInONE(invoice.amount);

    await chatService.depositFiatCredits(invoice.accountId, fiatCredits.toString());

    this.logger.info(`Payment from @${ctx.message.from.username} $${invoice.amount / 100} was completed!`);
  }

  private async createPaymentInvoice(ctx: OnMessageContext) {
    const accountId = this.payments.getAccountId(ctx);
    let tgUserId = accountId;
    if (ctx.update.message.chat.type === "group") {
      const members = await ctx.getChatAdministrators();
      const creator = members.find((member) => member.status === "creator");
      if (creator) {
        tgUserId = creator.user.id;
      }
    }

    let [cmd, usdAmountText = '10'] = ctx.message?.text?.split(' ') || [];

    let usdAmount = parseFloat(usdAmountText);
    if (isNaN(usdAmount)) {
      return ctx.reply('The value should be a valid number: 10 or 10.45');
    }

    const fixedUsdAmount = parseFloat(usdAmount.toFixed(2));

    const itemId = 'recharging-usd-' + fixedUsdAmount.toString();
    const amount = Math.ceil(fixedUsdAmount * 100); // cents

    const chatId = ctx.message.chat.id;
    const title = 'Buy Harmony1bot Credits'
    const description = 'Recharging harmony1bot description'
    const providerToken = config.telegramPayments.token;
    const currency = 'USD';
    const creditsAmount = await this.payments.getPriceInONE(amount);
    const prices: LabeledPrice[] = [{
      label: `${this.payments.toONE(creditsAmount)} ONE`,
      amount: amount
    }]

    const invoice = await invoiceService.create({tgUserId, accountId, itemId, amount});
    const payload = JSON.stringify({uuid: invoice.uuid});
    this.logger.info(`Send invoice: ${JSON.stringify({tgUserId, accountId, itemId, amount})}`)
    const photo_url = 'https://pbs.twimg.com/media/F5SofMsbgAApd2Y?format=png&name=small';
    await ctx.api.sendInvoice(chatId, title, description, payload, providerToken, currency, prices, {start_parameter: 'createInvoice', photo_url, photo_width: 502, photo_height: 502 });
  }
}
