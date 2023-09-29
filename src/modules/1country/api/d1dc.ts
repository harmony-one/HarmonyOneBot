import { ethers } from 'ethers'
// import web3Utils from 'web3-utils'
import Web3 from 'web3'
import pino, { type Logger } from 'pino'
// import bn, { BigNumber } from 'bignumber.js'

import DCv2Abi from '../contracts/DCv2'
import config from '../../../config'

export interface DomainRecord {
  renter: string
  rentTime: number
  lastPrice: {
    amount: string
    formatted: string
  }
  expirationTime: number
  url: string
  prev: string
  next: string
}

export interface DomainPrice {
  amount: string
  formatted: string
}

export interface SendNameExpired {
  isExpired: boolean
  expirationDate: number
  isInGracePeriod: boolean
}

const defaultProvider = new ethers.providers.JsonRpcProvider(
  config.country.defaultRPC
)

const EmptyAddress = '0x0000000000000000000000000000000000000000'

class DcClient {
  private readonly logger: Logger
  private readonly provider:
  | ethers.providers.Web3Provider
  | ethers.providers.JsonRpcProvider

  private readonly contractReadOnly: ethers.Contract

  constructor ({ provider }: // address,
  {
    provider: ethers.providers.Web3Provider | ethers.providers.JsonRpcProvider
  }) {
    if (!provider) {
      throw new Error('Provider is required')
    }
    this.provider = provider

    this.contractReadOnly = new ethers.Contract(
      config.country.contract,
      DCv2Abi,
      defaultProvider
    )
    this.logger = pino({
      name: 'DcClient',
      transport: {
        target: 'pino-pretty',
        options: { colorize: true }
      }
    })
    this.logger.info(`DC Contract ${config.country.contract} initialized`)
  }

  async duration (): Promise<any> {
    return this.contractReadOnly.duration()
  }

  async getPrice ({ name }: { name: string }): Promise<DomainPrice> {
    const price = await this.contractReadOnly.getPrice(name)
    const amount = price.toString()
    return {
      amount,
      formatted: Web3.utils.fromWei(amount)
    }
  }

  async getRecord ({ name }: { name: string }): Promise<DomainRecord> {
    if (!name) {
      throw new Error('name is empty')
    }
    const lastPrice = '0'
    const url = ''
    const prev = ''
    const next = ''

    const [ownerAddress, rentTime, expirationTime] = await Promise.all([
      this.contractReadOnly.ownerOf(name).catch(() => ''),
      this.contractReadOnly.duration(),
      this.contractReadOnly.nameExpires(name)
    ])
    return {
      renter:
        !ownerAddress || ownerAddress === EmptyAddress ? null : ownerAddress,
      rentTime: rentTime.toNumber() * 1000,
      expirationTime: expirationTime.toNumber() * 1000,
      lastPrice: {
        amount: lastPrice,
        formatted: Web3.utils.fromWei(lastPrice)
      },
      url,
      prev,
      next
    }
  }

  async checkNameExpired ({ name }: { name: string }): Promise<SendNameExpired> {
    const nameExpires = await this.contractReadOnly.nameExpires('fegloff.country')
    const epochSecondsDec = parseInt(nameExpires)
    const expirationDate = new Date(epochSecondsDec * 1000)
    const currentDate = new Date()
    const timeDifferenceMs = currentDate.getTime() - expirationDate.getTime()
    const daysDifference = Math.abs(
      Math.ceil(timeDifferenceMs / (1000 * 60 * 60 * 24))
    )
    const currentTimestamp = Math.floor(Date.now() / 1000)
    return {
      isExpired:
        epochSecondsDec === 0 ? false : currentTimestamp > epochSecondsDec,
      expirationDate: parseInt(nameExpires),
      isInGracePeriod: daysDifference <= 7
    }
  }

  async checkAvailable ({ name }: { name: string }): Promise<boolean> {
    const isAvailable = await this.contractReadOnly.available(name)
    return isAvailable?.toString()?.toLowerCase() === 'true'
  }
}

export const dcClient = new DcClient({ provider: defaultProvider })
