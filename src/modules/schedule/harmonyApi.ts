import axios from 'axios'
import moment from "moment/moment";
import {abbreviateNumber, getPercentDiff, formatValue} from "./utils";

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
    pageSize: 10000,
    fullTx: true,
    txType: 'RECEIVED',
    order: "DESC"
  }])

  // if (data) {
  //   console.log("Page size:", data.transactions.length);
  //   return data.transactions;
  // } else {
  //   console.log("Data is null or undefined");
  //   return [];
  // }

  return data ? data.transactions : []
}

export const getAddressBalance = async (address: string): Promise<number> => {
  return rpcRequest('hmyv2_getBalance', [address]);
}

export const getBotFee = async (address: string, daysCount: number): Promise<number> => {
  let history = await getAddressHistory(address);

  const startTimestamp = moment().subtract(daysCount,'days').unix()

  const total = history.reduce((acc, item) => {
    if(item.timestamp < startTimestamp) {
      return acc;
    }

    return acc + item.value;
  }, 0)

  return total / Math.pow(10, 18);

  
}

export const getBotFeeStats = async (address: string, daysCount = 30) => {
  let history = await getAddressHistory(address)

  const startTimestamp = moment().subtract(daysCount,'days').unix()
  const daysAmountMap: Record<string, number> = {}
 
  history.forEach((item) => {
    const { timestamp, value } = item
    if(timestamp >= startTimestamp) {
      const date = moment(timestamp * 1000).format('YYYYMMDD')
      if(daysAmountMap[date]) {
        daysAmountMap[date] += value
      } else {
        daysAmountMap[date] = value
      }
    }
  })

  const daysAmountList = Object.entries(daysAmountMap)
    .sort(([a], [b]) => +b - +a)
    .map(([_, value]) => value)

  const value = daysAmountList[0]
  const value7 = daysAmountList.slice(0,7).reduce((sum, item) => sum + item)
  const value30 = daysAmountList.slice(0,30).reduce((sum, item) => sum + item)
  // const valueTotal = daysAmountList.reduce((sum, item) => sum += item, 0)

  const average = value7 / daysCount
  let change = getPercentDiff(average, value).toFixed(1)
  if(+change > 0) {
    change = `+${change}`
  }

  return {
    daily: (abbreviateNumber(formatValue(value))).toString(),
    weekly: (abbreviateNumber(formatValue(value7))).toString(),
    monthly: (abbreviateNumber(formatValue(value30))).toString(),
    change: change.toString()
  }
}

