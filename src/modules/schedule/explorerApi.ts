import axios from 'axios'
import config from '../../config'
import pino from 'pino'
import moment from "moment/moment";

const logger = pino({
  name: 'ExplorerAPI',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
})

export interface MetricsDaily {
  date: string
  value: string
}

const { explorerRestApiUrl: apiUrl } = config.schedule

export const getFees = async (
  numberOfDays = 7
): Promise<MetricsDaily[]> => {
  try {
    const dateFrom = moment().subtract(numberOfDays + 1, 'days').format('YYYY-MM-DD')
    const dateTo = moment().subtract(1, 'days').format('YYYY-MM-DD')
    const url = `${apiUrl}/api/v1/lines/txnsFee?from=${dateFrom}&to=${dateTo}`
    const { data } = await axios.get<{
      chart: MetricsDaily[]
    }>(url)
    return data.chart
  } catch (e) {
    logger.error('EXPLORER API ERROR', (e as any).message)
    return []
  }
}

export const getActiveAccounts = async (
  numberOfDays = 7
): Promise<MetricsDaily[]> => {
  try {
    const dateFrom = moment().subtract(numberOfDays + 1, 'days').format('YYYY-MM-DD')
    const dateTo = moment().subtract(1, 'days').format('YYYY-MM-DD')
    const url = `${apiUrl}/api/v1/lines/activeAccounts?from=${dateFrom}&to=${dateTo}`
    const { data } = await axios.get<{
      chart: MetricsDaily[]
    }>(url)
    return data.chart
  } catch (e) {
    logger.error('EXPLORER API ERROR', (e as any).message)
    return []
  }
}
