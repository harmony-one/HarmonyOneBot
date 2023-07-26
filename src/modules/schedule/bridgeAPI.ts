import axios from 'axios'
import moment from 'moment'

const bridgeUrl = 'https://hmy-lz-api-token.fly.dev'

interface BridgeOperation {
  id: number
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

export const getOperations = async (): Promise<BridgeOperation[]> => {
  const { data } = await axios.get<BridgeOperationsResponse>(`${bridgeUrl}/operations?status=success&size=5000`)
  return data.content
}

export const getTokensList = async (): Promise<BridgeToken[]> => {
  const { data } = await axios.get<BridgeTokensResponse>(`${bridgeUrl}/tokens?size=5000`)
  return data.content
}

export const getTotalBridgetAssets = async () => {
  const lastWeek = moment().subtract(7,'days')
  const lastDay = moment().subtract(24,'hours')

  const operations = await getOperations()
  const tokens = await getTokensList()

  let totalAmount = 0
  let totalAmount24h = 0

  operations
    .filter((item) => item.type.includes('to_one'))
    .forEach((item) => {
      const { timestamp, amount, erc20Address, hrc20Address } = item

      const token = tokens.find(item =>
        item.erc20Address.toLowerCase() === erc20Address.toLowerCase()
        || item.hrc20Address.toLowerCase() === hrc20Address.toLowerCase()
      )

      if(!token) {
        console.error(`Cannot find bridged token: erc20Address: ${erc20Address}, hrc20Address: ${hrc20Address}, timestamp: ${timestamp}`)
        return
      }

      const { usdPrice } = token
      const amountUsd = amount * usdPrice

      if(timestamp >= lastWeek.unix()) {
        totalAmount += amountUsd
        if(timestamp >= lastDay.unix()) {
          totalAmount24h += amountUsd
        }
      }
    })

  return {
    totalAmount,
    totalAmount24h
  }
}
