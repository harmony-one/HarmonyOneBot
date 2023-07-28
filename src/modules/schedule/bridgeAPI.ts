import axios from 'axios'
import moment from 'moment'

const bridgeUrl = 'https://hmy-lz-api-token.fly.dev'

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

export const getOperations = async (page = 0, size = 1000): Promise<BridgeOperation[]> => {
  const { data } = await axios.get<BridgeOperationsResponse>(
    `${bridgeUrl}/operations-full?size=${size}&page=${page}`
  )
  return data.content
}

export const getTokensList = async (): Promise<BridgeToken[]> => {
  const { data } = await axios.get<BridgeTokensResponse>(`${bridgeUrl}/tokens?size=1000`)
  return data.content
}

export const getBridgeStats = async () => {
  const daysCount = 7
  const weekTimestamp = moment().subtract(daysCount,'days').unix()
  const yesterdayTimestamp = moment().subtract(1,'days').unix()

  let value = 0
  let valueTotal = 0
  const tokens = await getTokensList()

  for(let i = 0; i < 100; i++) {
    const items = await getOperations(i)

    items.filter((item) => {
        const { type, timestamp, amount, status } = item
        return type.includes('to_one')
          && status === 'success'
          && timestamp >= weekTimestamp
          && timestamp <= yesterdayTimestamp
          && amount > 0
      })
      .forEach((item) => {
        const { timestamp, amount, erc20Address, hrc20Address } = item

        const token = tokens.find(item =>
          erc20Address.toLowerCase() === erc20Address.toLowerCase()
          || hrc20Address.toLowerCase() === hrc20Address.toLowerCase()
        )

        if(!token) {
          console.error(`Cannot find bridged token: erc20Address: ${erc20Address}, hrc20Address: ${hrc20Address}, timestamp: ${timestamp}`)
          return
        }

        const { usdPrice } = token
        const amountUsd = Math.round(amount * usdPrice)

        if(timestamp >= weekTimestamp) {
          valueTotal += amountUsd

          if(timestamp >= yesterdayTimestamp) {
            value += amountUsd
          }
        }
      })

    // if(i > 0 && i % 10 === 0) {
    // console.log(`Page ${i}, total value: ${valueTotal.toString()} USD`)
    //}

    const lastElement = items[items.length - 1]
    if(lastElement && lastElement.timestamp < weekTimestamp) {
      break;
    }
  }

  console.log('value', value)
  console.log('valueTotal', valueTotal)

  const average = valueTotal / daysCount
  let change = ((value / average - 1) * 100).toFixed(2)
  if(+change > 0) {
    change = `+${change}`
  }

  return {
    value,
    change
  }
}
