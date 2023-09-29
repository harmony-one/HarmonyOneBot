import axios from 'axios'
import config from '../../config'

export interface TradingVolume {
  id: string
  volumeUSD: string
  date: number
}

interface SubgraphResponse {
  data: {
    uniswapDayDatas: TradingVolume[]
  }
}

const generateTradingVolumeQuery = (first = 30): string => {
  return `
  query {
    uniswapDayDatas(orderBy: date, orderDirection: desc, first: ${first}) {
      id,
      volumeUSD,
      date
    }
  }
`
}

export const getTradingVolume = async (daysCount = 30): Promise<TradingVolume[]> => {
  const { data } = await axios.post<SubgraphResponse>(
    config.schedule.swapSubgraphApiUrl,
    { query: generateTradingVolumeQuery(daysCount) }
  )
  return data.data.uniswapDayDatas
}
