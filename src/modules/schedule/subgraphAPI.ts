import axios from 'axios'
import config from '../../config'
import moment from "moment/moment";

interface SwapToken {
  feesUSD: string
}

interface Swap {
  timestamp: string
  token0: SwapToken
  token1: SwapToken
}

interface SubgraphData {
  swaps: Swap[]
}

interface SubgraphResponse {
  data: SubgraphData
}

const generateQuery = (timestamp: number, skip = 0, first = 100) => {
  return `
  query {
    swaps(orderBy: timestamp, orderDirection: desc, where: { timestamp_gt: ${timestamp} }, skip: ${skip}, first: ${first}) {
      timestamp
      token0 {
        feesUSD
      },
      token1 {
        feesUSD
      }
    }
  }
`
}

const getSubgraphData = async (timestamp: number, offset = 0, limit = 1000) => {
  const { data } = await axios.post<SubgraphResponse>(
    config.schedule.swapSubgraphApiUrl,
    {
      query: generateQuery(timestamp, offset, limit),
    },
  );
  return data.data;
}

export const getSwapFees = async() =>  {
  const daysCount = 7
  const weekTimestamp = moment().subtract(daysCount,'days').unix()
  const daysAmountMap: Record<string, number> = {}
  const chunkSize = 1000

  for (let i = 0; i < 20; i++) {
    const { swaps } = await getSubgraphData(weekTimestamp, 0, chunkSize)
    swaps.forEach(swap => {
      const { timestamp, token0, token1 } = swap
      const date = moment(+timestamp * 1000).format('YYYYMMDD')

      const amountUsd = Number(token0.feesUSD) + Number(token1.feesUSD)
      if(daysAmountMap[date]) {
        daysAmountMap[date] += amountUsd
      } else {
        daysAmountMap[date] = amountUsd
      }
    })

    if(swaps.length < chunkSize) {
      break;
    }
    const lastSwap = swaps[swaps.length - 1]
    if(lastSwap && +lastSwap.timestamp < weekTimestamp) {
      break;
    }
  }

  const daysAmountList = Object.entries(daysAmountMap)
    .sort(([a], [b]) => +b - +a)
    .map(([_, value]) => Math.round(value))

  const realDaysCount = daysAmountList.length
  const value = daysAmountList[0] // Latest day
  const valueTotal = daysAmountList.reduce((sum, item) => sum += item, 0)
  const average = valueTotal / realDaysCount
  let change = ((value / average - 1) * 100).toFixed(2)
  if(+change > 0) {
    change = `+${change}`
  }

  return {
    value,
    change
  }
}
