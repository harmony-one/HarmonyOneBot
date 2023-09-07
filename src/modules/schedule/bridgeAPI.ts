import axios from 'axios'
import moment from 'moment'
import {abbreviateNumber, getPercentDiff} from "./utils";

const bridgeUrl = 'https://hmy-lz-api-token.fly.dev'
const stakeApiUrl = 'https://api.stake.hmny.io'

interface BridgeOperation {
  id: number
  status: string
  type: string
  erc20Address: string
  hrc20Address: string
  token: string
  tokenType: string
  network: string
  amount: number
  ethAddress: string
  oneAddress: string
  timestamp: number
}

interface BridgeOperationsResponse {
  content: BridgeOperation[]
  totalElements: number
  size: number
  page: number
}

interface BridgeToken {
  hrc20Address: string
  erc20Address: string
  proxyERC20: string
  proxyHRC20: string
  name: string
  symbol: string
  decimals: string
  totalLocked: string
  totalSupply: string
  totalLockedNormal: string
  totalLockedUSD: string
  token: string
  type: string
  network: string
  usdPrice: number
}

interface BridgeTokensResponse {
  content: BridgeToken[]
  totalElements: number
  size: number
  page: number
}

export const getOperations = async (page = 0, size = 10000): Promise<BridgeOperation[]> => {
  const { data } = await axios.get<BridgeOperationsResponse>(
    `${bridgeUrl}/operations-full?size=${size}&page=${page}`
  )
  return data.content
}

export const getTokensList = async (): Promise<BridgeToken[]> => {
  const { data } = await axios.get<BridgeTokensResponse>(`${bridgeUrl}/tokens?size=1000`)
  return data.content
}

export const getStakingStats = async () => {
  const { data } = await axios.get<{ "total-staking": string }>(`${stakeApiUrl}/networks/harmony/network_info_lite`)
  return data
}

export const getBridgeStats = async () => {
  const daysCount = 7
  const weekTimestamp = moment().subtract(daysCount - 1,'days').unix()
  const yesterdayTimestamp = moment().subtract(1,'days').unix()

  const tokens = await getTokensList()
  const daysAmountMap: Record<string, number> = {}

  for(let i = 0; i < 100; i++) {
    const items = await getOperations(i)

    items.filter((item) => {
        const { type, timestamp, amount, status } = item
        return status === 'success'
          && timestamp >= weekTimestamp
          && amount > 0
      })
      .forEach((item) => {
        const { type, timestamp, amount, erc20Address, hrc20Address } = item

        const isIncome = type.includes('to_one')
        const token = tokens.find(item =>
          erc20Address.toLowerCase() === erc20Address.toLowerCase()
          || hrc20Address.toLowerCase() === hrc20Address.toLowerCase()
        )

        if(!token) {
          console.error(`Cannot find bridged token: erc20Address: ${erc20Address}, hrc20Address: ${hrc20Address}, timestamp: ${timestamp}`)
          return
        }

        const { usdPrice } = token
        const amountUsd = (isIncome ? 1 : -1) * Math.round(amount * usdPrice)

        const date = moment(timestamp * 1000).format('YYYYMMDD')
        if(daysAmountMap[date]) {
          daysAmountMap[date] += amountUsd
        } else {
          daysAmountMap[date] = amountUsd
        }
      })

    const lastElement = items[items.length - 1]
    if(lastElement && lastElement.timestamp < weekTimestamp) {
      break;
    }
  }

  const daysAmountList = Object.entries(daysAmountMap)
    .sort(([a], [b]) => +b - +a)
    .map(([_, value]) => value)

  const value = daysAmountList[0] // Latest day
  const valueTotal = daysAmountList.reduce((sum, item) => sum += item, 0)

  const average = valueTotal / daysCount
  let change = getPercentDiff(average, value).toFixed(1)
  if(+change > 0) {
    change = `+${change}`
  }

  return {
    value: abbreviateNumber(value),
    change
  }
}

export const getTVL = async () => {
  const tokens = await getTokensList()
  return tokens.reduce((acc, item) => acc + +item.totalLockedUSD, 0)
}

export const getTotalStakes = async () => {
  const { "total-staking": totalStaking } = await getStakingStats()
  return Math.round(+totalStaking / 10**18)
}
