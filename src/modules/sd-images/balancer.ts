import config from '../../config'
import axios from 'axios'
import { type COMMAND } from './helpers'

export enum OPERATION_STATUS {
  WAITING = 'WAITING',
  IN_PROGRESS = 'IN_PROGRESS',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  CANCELED_BY_CLIENT = 'CANCELED_BY_CLIENT',
  CANCELED_BY_BALANCER = 'CANCELED_BY_BALANCER',
}

export interface IOperationReq {
  type: COMMAND
  model?: string
  lora?: string
  controlnet?: string
}

export interface IBalancerOperation {
  id: string
  status: OPERATION_STATUS
  queueNumber: number
  queueTotalNumber: number
  serverNumber: number
  server: {
    comfyAPI: string
    trainAPI: string
    comfyHost: string
    comfyWsHost: string
  }
}

export const createOperation = async (operation: IOperationReq): Promise<IBalancerOperation> => {
  const res = await axios.post<IBalancerOperation>(`${config.sdBalancer}/operations`, operation)

  return res.data
}

export const getOperationById = async (id: string): Promise<IBalancerOperation> => {
  const res = await axios.get<IBalancerOperation>(`${config.sdBalancer}/operations/${id}`)

  return res.data
}

export const completeOperation = async (id: string, status: OPERATION_STATUS): Promise<IBalancerOperation | undefined> => {
  try {
    const res = await axios.post<IBalancerOperation>(
            `${config.sdBalancer}/operations/${id}/complete`, { status }
    )

    return res.data
  } catch (e) { }
}
