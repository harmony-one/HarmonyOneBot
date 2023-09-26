import axios from 'axios'

import config from '../../../config'

const base = axios.create({
  baseURL: config.country.relayApiUrl,
  timeout: 10000
})

export type CheckDomainResult = {
  isAvailable: any
  renewPrice: any
  responseText: any
  isReserved: any
  isRegistered: any
  error: string
  regPrice: any
  restorePrice: any
  transferPrice: any } | { error: string }
export const relayApi = (): {
  enableSubdomains: (domainName: string) => Promise<void>
  checkDomain: ({ sld }: { sld: string }) => Promise<CheckDomainResult>
  createCert: ({
    domain,
    address,
    async
  }: { domain: string, address?: string, async?: boolean }) => Promise<{ success: any, sld: any, nakedJobId: any, error: any, mcJobId: any }>
  genNFT: ({ domain }: { domain: string }) => Promise<{ metadata: any, generated: any }>
  purchaseDomain: (params: {
    domain: string
    txHash: string
    address: string
  }) => Promise<{ success: any
    domainCreationDate: any
    domainExpiryDate: any
    traceId: any
    reqTime: any
    responseText: any }>
} => {
  return {
    enableSubdomains: async (domainName: string) => {
      const { data } = await base.post('/enable-subdomains', { domain: `${domainName}${config.country.tld}` })
      console.log('enableSubdomains', data)
    },
    checkDomain: async ({ sld }: { sld: string }) => {
      try {
        const {
          data: {
            isAvailable,
            isReserved,
            isRegistered,
            regPrice,
            renewPrice,
            transferPrice,
            restorePrice,
            responseText,
            error = ''
          }
        } = await base.post('/check-domain', { sld })
        return {
          isAvailable,
          isReserved,
          isRegistered,
          regPrice,
          renewPrice,
          transferPrice,
          restorePrice,
          responseText,
          error
        }
      } catch (ex: any) {
        return { error: ex.toString() }
      }
    },
    genNFT: async ({ domain }: { domain: string }) => {
      const { data: { generated, metadata } } = await base.post('/gen', { domain })
      return {
        generated,
        metadata
      }
    },
    createCert: async ({
      domain,
      address,
      async = true
    }: {
      domain: string
      address?: string
      async?: boolean
    }) => {
      const { data: { success, sld, mcJobId, nakedJobId, error } } = await base.post('/cert', { domain, address, async })
      return {
        success,
        sld,
        mcJobId,
        nakedJobId,
        error
      }
    },
    purchaseDomain: async ({ domain, txHash, address }) => {
      const {
        data: {
          success,
          domainCreationDate,
          domainExpiryDate,
          traceId,
          reqTime,
          responseText
        }
      } = await base.post('/purchase', { domain, txHash, address, fast: 1 })
      return {
        success,
        domainCreationDate,
        domainExpiryDate,
        traceId,
        reqTime,
        responseText
      }
    }
  }
}
