import { ChatService } from './chat.service'
import { StatsService } from './stats.service'
import { InvoiceService } from './invoice.service'

export const chatService = new ChatService()
export const statsService = new StatsService()
export const invoiceService = new InvoiceService()
