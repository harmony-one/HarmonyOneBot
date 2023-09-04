import {OnMessageContext} from "../types";
import {LabeledPrice} from "grammy/out/types";

export class TelegramPayments {
  private async onPreCheckout(ctx: OnMessageContext) {
    const preCheckoutQuery = ctx.update.pre_checkout_query
    console.log('preCheckoutQuery', preCheckoutQuery)

    if(preCheckoutQuery) {
      await ctx.api.answerPreCheckoutQuery(preCheckoutQuery?.id, true)
    }
  }

  onSuccessfulPayment(ctx: OnMessageContext) {
    console.log('Payment successfull!')
  }

  private async createPaymentInvoice(ctx: OnMessageContext) {
    const chatId = ctx.message.chat.id

    const title = 'title'
    const description = 'description'
    const payload = 'payload'
    const providerToken = '284685063:TEST:NWU3MGRjMGY4NjMz'
    const currency = 'USD'
    const prices: LabeledPrice[] = [{
      label: 'Test',
      amount: 100
    }]
    await ctx.api.sendInvoice(chatId, title, description, payload, providerToken, currency, prices)
  }

  public async onEvent(ctx: OnMessageContext) {
    console.log('OnEvent', ctx)
    const preCheckoutQuery = ctx.update.pre_checkout_query
    if(preCheckoutQuery) {
      return await this.onPreCheckout(ctx)
    }

    const successfulPayment = ctx.message.successful_payment
    if(successfulPayment) {
      return this.onSuccessfulPayment(ctx)
    }

    await this.createPaymentInvoice(ctx)
  }
}
