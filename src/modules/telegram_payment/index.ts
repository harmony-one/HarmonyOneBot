import {OnMessageContext, OnPreCheckoutContext} from "../types";
import {LabeledPrice} from "grammy/out/types";
import config from "../../config";

export class TelegramPayments {
  public async onPreCheckout(ctx: OnPreCheckoutContext) {
    await ctx.answerPreCheckoutQuery(true)
  }

  onSuccessfulPayment(ctx: OnMessageContext) {
    console.log(`Payment from @${ctx.message.from.username} was completed!`)
  }

  private async createPaymentInvoice(ctx: OnMessageContext) {
    const chatId = ctx.message.chat.id

    const title = 'Invoice title'
    const description = 'Invoice description'
    const payload = 'payload'
    const providerToken = config.telegramPayments.token
    const currency = 'USD'
    const prices: LabeledPrice[] = [{
      label: 'Test',
      amount: 100
    }]
    await ctx.api.sendInvoice(chatId, title, description, payload, providerToken, currency, prices)
  }

  public async onEvent(ctx: OnMessageContext) {
    const successfulPayment = ctx.message.successful_payment
    if(successfulPayment) {
      return this.onSuccessfulPayment(ctx)
    }

    await this.createPaymentInvoice(ctx)
  }
}
