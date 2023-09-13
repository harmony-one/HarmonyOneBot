import {AppDataSource} from "./datasource";
import {Invoice} from "./entities/Invoice";

const invoiceRepository = AppDataSource.getRepository(Invoice);

export interface InvoiceParams {
  tgUserId: number
  accountId: number
  amount: number
  itemId: string
}

export class InvoiceService {
  public create(data: InvoiceParams) {
    let invoice = new Invoice();

    invoice.tgUserId = data.tgUserId;
    invoice.accountId = data.accountId;
    invoice.status = 'init';
    invoice.itemId = data.itemId;
    invoice.amount = data.amount;
    invoice.currency = 'USD';

    return invoiceRepository.save(invoice);
  }

  public get(uuid: string) {
    return invoiceRepository.findOneBy({uuid});
  }

  public async setPendingStatus(data: Pick<Invoice, 'uuid'>) {
    const invoice = await invoiceRepository.findOneBy({uuid: data.uuid});

    if (!invoice) {
      throw new Error(`Invoice not found ${data.uuid}`);
    }
    invoice.status = 'pending';

    return invoiceRepository.save(invoice);
  }

  public async setSuccessStatus(data: Pick<Invoice, 'uuid' | 'telegramPaymentChargeId' | 'providerPaymentChargeId'>) {
    const invoice = await invoiceRepository.findOneBy({uuid: data.uuid});

    if (!invoice) {
      throw new Error(`Invoice not found ${data.uuid}`);
    }
    invoice.status = 'success';
    invoice.providerPaymentChargeId = data.providerPaymentChargeId;
    invoice.telegramPaymentChargeId = data.telegramPaymentChargeId;

    return invoiceRepository.save(invoice);
  }
}
