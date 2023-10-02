import { AppDataSource } from './datasource'
import { Invoice } from './entities/Invoice'

const invoiceRepository = AppDataSource.getRepository(Invoice)

export interface InvoiceParams {
  tgUserId: number
  accountId: number
  amount: string
  itemId: string
  currency?: string
}

export class InvoiceService {
  public async create (data: InvoiceParams): Promise<Invoice> {
    const invoice = new Invoice()

    invoice.tgUserId = data.tgUserId
    invoice.accountId = data.accountId
    invoice.status = 'init'
    invoice.itemId = data.itemId
    invoice.amount = data.amount
    invoice.currency = data.currency ?? 'USD'

    return await invoiceRepository.save(invoice)
  }

  public async get (uuid: string): Promise<Invoice | null> {
    return await invoiceRepository.findOneBy({ uuid })
  }

  public async setPendingStatus (data: Pick<Invoice, 'uuid'>): Promise<Invoice> {
    const invoice = await invoiceRepository.findOneBy({ uuid: data.uuid })

    if (!invoice) {
      throw new Error(`Invoice not found ${data.uuid}`)
    }
    invoice.status = 'pending'

    return await invoiceRepository.save(invoice)
  }

  public async setSuccessStatus (data: Pick<Invoice, 'uuid' | 'telegramPaymentChargeId' | 'providerPaymentChargeId'>): Promise<Invoice> {
    const invoice = await invoiceRepository.findOneBy({ uuid: data.uuid })

    if (!invoice) {
      throw new Error(`Invoice not found ${data.uuid}`)
    }
    invoice.status = 'success'
    invoice.providerPaymentChargeId = data.providerPaymentChargeId || ''
    invoice.telegramPaymentChargeId = data.telegramPaymentChargeId || ''

    return await invoiceRepository.save(invoice)
  }
}
