import { type OnMessageContext, type OnPreCheckoutContext, type OnSuccessfullPayment } from '../types'
import { type LabeledPrice } from 'grammy/out/types'
import config from '../../config'
import { chatService, invoiceService } from '../../database/services'
import { type BotPayments } from '../payment'
import pino, { type Logger } from 'pino'
import { Callbacks } from '../types';
import { OnCallBackQueryData } from '../types';

enum SupportedCommands {
  BUY = 'buy',
}

export class TelegramPayments {
  private readonly payments: BotPayments

  private readonly logger: Logger

  constructor (payments: BotPayments) {
    this.payments = payments
    this.logger = pino({
      name: 'TelegramPayment',
      transport: {
        target: 'pino-pretty',
        options: { colorize: true }
      }
    })
  }

  public isSupportedEvent (ctx: OnMessageContext | OnCallBackQueryData): boolean {
    return ctx.hasCommand(Object.values(SupportedCommands)) || ctx.has('message:successful_payment') || ctx.hasCallbackQuery(Callbacks.CreditsFiatBuy)
  }

  public async onEvent (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    if (ctx.hasCommand(SupportedCommands.BUY) || ctx.hasCallbackQuery(Callbacks.CreditsFiatBuy)) {
      await this.createPaymentInvoice(ctx)
      return
    }

    if (ctx.has('message:successful_payment')) {
      const successfulPayment = ctx.message.successful_payment
      if (successfulPayment) {
        await this.onSuccessfulPayment(ctx as OnSuccessfullPayment)
      }
    }
  }

  public async onPreCheckout (ctx: OnPreCheckoutContext): Promise<void> {
    const { uuid } = JSON.parse(ctx.preCheckoutQuery.invoice_payload) as { uuid: string }

    const invoice = await invoiceService.get(uuid)

    if (!invoice || invoice.status !== 'init') {
      await ctx.answerPreCheckoutQuery(false, { error_message: 'Outdated invoice' })
      return
    }

    await ctx.answerPreCheckoutQuery(true)
  }

  async onSuccessfulPayment (ctx: OnSuccessfullPayment): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { invoice_payload, telegram_payment_charge_id, provider_payment_charge_id } = ctx.message.successful_payment

    const { uuid } = JSON.parse(invoice_payload) as { uuid: string }
    const telegramPaymentChargeId = telegram_payment_charge_id
    const providerPaymentChargeId = provider_payment_charge_id

    const invoice = await invoiceService.setSuccessStatus({ uuid, telegramPaymentChargeId, providerPaymentChargeId })
    const fiatCredits = await this.payments.getPriceInONE(invoice.amount)

    await chatService.depositFiatCredits(invoice.accountId, fiatCredits.toString())

    this.logger.info(`Payment from @${ctx.message.from.username} $${invoice.amount / 100} was completed!`)
  }

  private async createPaymentInvoice (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    const accountId = this.payments.getAccountId(ctx)
    let tgUserId = accountId
    if (ctx.update?.message?.chat.type === 'group' || ctx.callbackQuery?.message?.chat.type === 'group') {
      const members = await ctx.getChatAdministrators()
      const creator = members.find((member) => member.status === 'creator')
      if (creator) {
        tgUserId = creator.user.id
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, usdAmountText = '5'] = ctx.message?.text?.split(' ') ?? []

    const usdAmount = parseFloat(usdAmountText)
    if (isNaN(usdAmount)) {
      await ctx.reply('The value should be a valid number: 10 or 10.45')
      return
    }

    if (usdAmount < 1) {
      await ctx.reply('$1 Purchase Minimum')
      return;
    }

    if (usdAmount > 10) {
      await ctx.reply('$10 Purchase Maximum')
      return;
    }

    const fixedUsdAmount = parseFloat(usdAmount.toFixed(2))

    const itemId = 'recharging-usd-' + fixedUsdAmount.toString()
    const amount = Math.ceil(fixedUsdAmount * 100) // cents

    const getChatId = (): number => {
      if (ctx.message) {
        return ctx.message.chat.id
      }

      if (ctx.callbackQuery && ctx.callbackQuery.message) {
        return ctx.callbackQuery.message.chat.id
      }

      throw new Error('Couldn\'t get account ID.')
    }

    console.log('### accountId', accountId);
    console.log('### tgUserId', tgUserId);

    const chatId = getChatId()
    const title = 'AI Credits'
    const description = `Purchase up to $10.`
    const providerToken = config.telegramPayments.token
    const currency = 'USD'
    const creditsAmount = await this.payments.getPriceInONE(amount)
    const prices: LabeledPrice[] = [{
      label: `${this.payments.toONE(creditsAmount)} ONE`,
      amount
    }]

    const invoice = await invoiceService.create({ tgUserId, accountId, itemId, amount })
    const payload = JSON.stringify({ uuid: invoice.uuid })
    this.logger.info(`Send invoice: ${JSON.stringify({ tgUserId, accountId, itemId, amount })}`)
    // const photoUrl = 'https://pbs.twimg.com/media/F5SofMsbgAApd2Y?format=png&name=small'
    await ctx.api.sendInvoice(chatId, title, description, payload, providerToken, currency, prices, { start_parameter: 'createInvoice' })
  }
}
