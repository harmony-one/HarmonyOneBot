import axios from 'axios'
import config from "../../config";

export enum MetricsDailyType {
  walletsCount = 'wallets_count',
  transactionsCount = 'transactions_count',
  averageFee = 'average_fee',
  blockSize = 'block_size',
  totalFee = 'total_fee',
}

export interface MetricsDaily {
  date: string
  value: string
}

const { explorerRestApiUrl: apiUrl, explorerRestApiKey: apiKey } = config.schedule

export const getFeeStats = async () => {
  const { explorerRestApiUrl: apiUrl, explorerRestApiKey: apiKey } = config.schedule

  const daysCount = 7
  const requestUrl = `${apiUrl}/v0/metrics?type=total_fee&limit=${daysCount}`
  const { data: metrics } = await axios.get<MetricsDaily[]>(requestUrl, {
    headers: {
      'X-API-KEY': apiKey
    }
  })

  const feeTotal = metrics.reduce((acc, item) => {
    acc += Number(item.value)
    return acc
  }, 0)

  const value = +metrics[0].value
  const average = feeTotal / daysCount
  let change = ((value / average - 1) * 100).toFixed(2)
  if(+change > 0) {
    change = `+${change}`
  }

  return {
    value,
    change
  }
}
