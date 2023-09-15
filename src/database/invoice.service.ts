import { AppDataSource } from './datasource'
import { Invoice } from './entities/Invoice'

const invoiceRepository = AppDataSource.getRepository(Invoice)

export interface InvoiceParams {
  tgUserId: number
  accountId: number
  amount: number
  itemId: string
}

export class InvoiceService {
  public async create (data: InvoiceParams) {
    const invoice = new Invoice()

    invoice.tgUserId = data.tgUserId
    invoice.accountId = data.accountId
    invoice.status = 'init'
    invoice.itemId = data.itemId
    invoice.amount = data.amount
    invoice.currency = 'USD'

    return await invoiceRepository.save(invoice)
  }

  public async get (uuid: string) {
    return await invoiceRepository.findOneBy({ uuid })
  }

  public async setPendingStatus (data: Pick<Invoice, 'uuid'>) {
    const invoice = await invoiceRepository.findOneBy({ uuid: data.uuid })

    if (!invoice) {
      throw new Error(`Invoice not found ${data.uuid}`)
    }
    invoice.status = 'pending'

    return await invoiceRepository.save(invoice)
  }

  public async setSuccessStatus (data: Pick<Invoice, 'uuid' | 'telegramPaymentChargeId' | 'providerPaymentChargeId'>) {
    const invoice = await invoiceRepository.findOneBy({ uuid: data.uuid })

    if (!invoice) {
      throw new Error(`Invoice not found ${data.uuid}`)
    }
    invoice.status = 'success'
    invoice.providerPaymentChargeId = data.providerPaymentChargeId
    invoice.telegramPaymentChargeId = data.telegramPaymentChargeId

    return await invoiceRepository.save(invoice)
  }
}
