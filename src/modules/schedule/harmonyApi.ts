import axios from 'axios'
import moment from "moment/moment";
import {getPercentDiff} from "./utils";

const rpcUrl = 'https://rpc.s0.t.hmny.io'

const rpcRequest = async (method: string, params: Array<any> = []) => {
  const { data } = await axios.post(rpcUrl, {
    jsonrpc: '2.0',
    id: 1,
    method,
    params
  })
  return data.result
}

export interface RpcTransaction {
  timestamp: number
  value: number
}

export const getAddressHistory = async (address: string): Promise<RpcTransaction[]> => {
  const data = await rpcRequest('hmyv2_getTransactionsHistory', [{
    address,
    pageIndex: 0,
    pageSize: 1000,
    fullTx: true,
    txType: 'RECEIVED',
    order: "ASC"
  }])
  return data ? data.transactions : []
}

export const getBotFeeStats = async (address: string) => {
  let history = await getAddressHistory(address)

  const daysCount = 7
  const startTimestamp = moment().subtract(daysCount,'days').unix()
  const weekTimestamps = Array(daysCount)
    .fill(0)
    .map((_, index) => moment().subtract((daysCount - index),'days').unix())
  const weekValues = Array(daysCount).fill(0)
  let valueTotal = 0

  history.forEach((item) => {
    if(item.timestamp >= startTimestamp) {
      const amount = +item.value
      const [closestTimestamp] = [...weekTimestamps]
        .sort((a, b) =>
          Math.abs(a - item.timestamp) - Math.abs(b - item.timestamp))
      const closestIndex = weekTimestamps.indexOf(closestTimestamp)
      weekValues[closestIndex] += amount
      valueTotal += amount
    }
  })

  const value = weekValues[weekValues.length - 1]
  const average = valueTotal / daysCount
  let change = getPercentDiff(value, average).toFixed(2)
  if(+change > 0) {
    change = `+${change}`
  }

  return {
    value: Math.round(value / Math.pow(10, 18)),
    change
  }
}

