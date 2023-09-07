import {OnMessageContext, OnPreCheckoutContext, OnSuccessfullPayment} from "../types";
import {LabeledPrice} from "grammy/out/types";
import config from "../../config";
import {invoiceService} from "../../database/services";
import {BotPayments} from "../payment";

export class TelegramPayments {

  private payments: BotPayments;

  constructor(payments: BotPayments) {
    this.payments = payments;
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

    await invoiceService.setSuccessStatus({uuid, telegramPaymentChargeId, providerPaymentChargeId});
    console.log(`Payment from @${ctx.message.from.username} was completed!`)
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

    const itemId = 'recharging2usd';
    const amount = 200; // cents

    const chatId = ctx.message.chat.id;
    const title = 'Recharging harmony1bot'
    const description = 'Recharging harmony1bot description'
    const providerToken = config.telegramPayments.token;
    const currency = 'USD';
    const prices: LabeledPrice[] = [{
      label: '100 bot credits',
      amount: amount
    }]

    const invoice = await invoiceService.create({tgUserId, accountId, itemId, amount});
    const payload = JSON.stringify({uuid: invoice.uuid});
    await ctx.api.sendInvoice(chatId, title, description, payload, providerToken, currency, prices, {start_parameter: itemId});
  }

  public async onEvent(ctx: OnMessageContext) {
    const successfulPayment = ctx.message.successful_payment
    if(successfulPayment) {
      return this.onSuccessfulPayment(ctx as OnSuccessfullPayment)
    }

    await this.createPaymentInvoice(ctx)
  }
}
