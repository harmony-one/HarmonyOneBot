import axios from 'axios'
import moment from "moment/moment";
import {abbreviateNumber, getPercentDiff} from "./utils";

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

export const getBotFeeStats = async (address: string, daysCount = 7) => {
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
  const valueTotal = daysAmountList.reduce((sum, item) => sum += item, 0)
  const average = valueTotal / daysCount
  let change = getPercentDiff(average, value).toFixed(1)
  if(+change > 0) {
    change = `+${change}`
  }
  const valueFormatted = Math.round(value / Math.pow(10, 18))

  return {
    value: abbreviateNumber(valueFormatted),
    change
  }
}


/*--------------------------------------------------------------------------------------------------*/
// AUDIT
//

const getBotFeeAudit = async (address: string, daysCount = 30): Promise<Record<string,number>> => {
  let history = await getAddressHistory(address);
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

  let total = totalFeesAudit(daysAmountMap) / Math.pow(10, 18)
  const { maxFeeDay } = maxFeesAudit(daysAmountMap);

  return {
    total,
    maxFeeDay,
  }
}

const totalFeesAudit = (daysAmountMap: Record<string,number>): number => {
  return Object.values(daysAmountMap).reduce((acc, fee) => acc + fee, 0);
}

const maxFeesAudit = (daysAmountMap: Record<string, number>): Record<string,number> => {
  let maxFee = 0;
  let maxFeeDay = "";
  for (const [day, fee] of Object.entries(daysAmountMap)) {
    if (fee > maxFee) {
      maxFee = fee;
      maxFeeDay = day;
    }
  }
  return { maxFeeDay: maxFee };
}

const minFeesAudit = (daysAmountMap: Record<string, number>): Record<string,number> => {
  let minFee = 1000000;
  let minFeeDay = "";
  for (const [day, fee] of Object.entries(daysAmountMap)) {
    if (fee < minFee) {
      minFee = fee;
      minFeeDay = day;
    }
  }
  return { minFeeDay: minFee };
}

export {
  getBotFeeAudit,
  totalFeesAudit
}