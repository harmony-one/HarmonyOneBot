import axios from 'axios'
import pino from 'pino'

const logger = pino({
  name: 'ExchangeAPI',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
})

interface CoinGeckoResponse {
  harmony: {
    usd: string
  }
}

export const getOneRate = async (): Promise<number> => {
  try {
    const { data } = await axios.get<CoinGeckoResponse>(
      'https://api.coingecko.com/api/v3/simple/price?ids=harmony&vs_currencies=usd'
    )
    return +data.harmony.usd
  } catch (e) {
    logger.error(e)
    return 0
  }
}
