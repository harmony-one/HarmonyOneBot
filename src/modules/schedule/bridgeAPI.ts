import axios from 'axios'
import moment from 'moment'
// import { Sentry } from '../../monitoring/instrument'
import { abbreviateNumber, getPercentDiff } from './utils'
import { BigNumber } from 'bignumber.js'
import pino from 'pino'

const logger = pino({
  name: 'BridgeAPI',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
})

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

interface StakingHistoryItem {
  'total-staking': number
  current_epoch: number
}

type StakingHistory = Record<string, StakingHistoryItem>

export const getStakingStats = async (): Promise<{ 'total-staking': string, history: StakingHistory }> => {
  const { data } = await axios.get<{ 'total-staking': string, history: StakingHistory }>(`${stakeApiUrl}/networks/harmony/network_info_lite`)
  return data
}

export const getBridgeStats = async (): Promise<{ change: string, value: string }> => {
  const daysCount = 7
  const weekTimestamp = moment().subtract(daysCount - 1, 'days').unix()

  const tokens = await getTokensList()
  const daysAmountMap: Record<string, number> = {}

  for (let i = 0; i < 100; i++) {
    const items = await getOperations(i)

    items.filter((item) => {
      const { timestamp, amount, status } = item
      return status === 'success' &&
          timestamp >= weekTimestamp &&
          amount > 0
    })
      .forEach((item) => {
        const { type, timestamp, amount, erc20Address, hrc20Address } = item

        const isIncome = type.includes('to_one')
        const token = tokens.find(item =>
          item.erc20Address.toLowerCase() === erc20Address.toLowerCase() ||
          item.hrc20Address.toLowerCase() === hrc20Address.toLowerCase()
        )

        if (!token) {
          console.error(`Cannot find bridged token: erc20Address: ${erc20Address}, hrc20Address: ${hrc20Address}, timestamp: ${timestamp}`)
          return
        }

        const { usdPrice } = token
        const amountUsd = (isIncome ? 1 : -1) * Math.round(amount * usdPrice)

        const date = moment(timestamp * 1000).format('YYYYMMDD')
        if (daysAmountMap[date]) {
          daysAmountMap[date] += amountUsd
        } else {
          daysAmountMap[date] = amountUsd
        }
      })

    const lastElement = items[items.length - 1]
    if (lastElement && lastElement.timestamp < weekTimestamp) {
      break
    }
  }

  const daysAmountList = Object.entries(daysAmountMap)
    .sort(([a], [b]) => +b - +a)
    .map(([_, value]) => value)

  const value = daysAmountList[0] // Latest day
  const valueTotal = daysAmountList.reduce((sum, item) => { sum += item; return sum }, 0)

  const average = valueTotal / daysCount
  let change = getPercentDiff(average, value).toFixed(1)
  if (+change > 0) {
    change = `+${change}`
  }

  return {
    value: abbreviateNumber(value),
    change
  }
}

export const getTVL = async (): Promise<number> => {
  try {
    const tokens = await getTokensList()
    return tokens.reduce((acc, item) => acc + +item.totalLockedUSD, 0)
  } catch (e) {
    logger.error(e)
    return 0
  }
}

export const getTotalStakes = async (): Promise<number> => {
  const { 'total-staking': totalStaking } = await getStakingStats()
  return Math.round(+totalStaking / 10 ** 18)
}

export const getAvgStakes = async (): Promise<number> => {
  try {
    const { history } = await getStakingStats()
    const sortedHistory = Object.values(history).sort((a, b) => b.current_epoch - a.current_epoch)
    const epochCount = 30
    const values = []
    for (let i = 0; i < sortedHistory.length || i < epochCount; i++) {
      values.push(sortedHistory[i]['total-staking'])
    }
    // calc avg total / values.length
    return values.reduce((acc, item) => {
      return acc.plus(item)
    }, BigNumber(0)).div(values.length).div(10 ** 18).toNumber()
  } catch (e) {
    logger.error(e)
    // Sentry.captureException(e)
    return 0
  }
}
