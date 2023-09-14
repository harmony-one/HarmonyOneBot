import config from '../../../config'
import { DomainPrice, dcClient } from '../api/d1dc'
import { relayApi } from '../api/relayApi'
import { getUSDPrice } from '../api/coingecko'
import { formatONEAmount } from '.'

export const isDomainAvailable = async (domainName: string) => {
  const nameExpired = await dcClient.checkNameExpired({ name: domainName })
  const web3IsAvailable = await dcClient.checkAvailable({ name: domainName })
  const web2IsAvailable = await relayApi().checkDomain({ sld: domainName })
  const isAvailable = ((nameExpired.expirationDate > 0 && web3IsAvailable && web2IsAvailable) || // requested by Aaron
  (web2IsAvailable && web3IsAvailable) || // initial comparsion
  (nameExpired.isExpired && !nameExpired.isInGracePeriod)) as boolean
  let domainPrice = ''
  if (isAvailable) {
    domainPrice = (await dcClient.getPrice({ name: domainName })).formatted
  }
  return {
    isAvailable:
      ((nameExpired.expirationDate > 0 && web3IsAvailable && web2IsAvailable) || // requested by Aaron
      (web2IsAvailable && web3IsAvailable) || // initial comparsion
      (nameExpired.isExpired && !nameExpired.isInGracePeriod)) as boolean,
    isInGracePeriod: nameExpired.isInGracePeriod,
    priceOne: domainPrice && formatONEAmount(domainPrice),
    priceUSD: domainPrice ? await getUSDPrice(domainPrice) : { price: 0, error: null }
  }
}

const isRestricted = (name: string): boolean => {
  const phrases = config.country.restrictedPhrases
  for (let i = 0; i < phrases.length; i++) {
    if (name.includes(phrases[i])) return true
  }
  return false
}

const SPECIAL_NAMES = ['0', '1']
// prettier-ignore

const RESERVED_NAMES = [
  ...SPECIAL_NAMES
]

const nameUtils = {
  RESTRICTED_VALID_NAME: /[a-z0-9]+/,
  VALID_NAME: /^[a-zA-Z0-9]{1,}((?!-)[a-zA-Z0-9]{0,}|-[a-zA-Z0-9]{1,})+$/,
  SPECIAL_NAMES: ['0', '1'],

  isValidName: (name: string) => {
    return nameUtils.VALID_NAME.test(name)
  },
  isValidLength: (name: string) => {
    return name.length < 64
  },
  isTaken: (name: string) => {
    return RESERVED_NAMES.includes(name)
  },
  isRestricted: (name: string) => {
    return isRestricted(name)
  },
  isReservedName: (name: string) => {
    return false
    // name.length <= config.domain.reserved
  }
}

export const validateDomainName = (domainName: string) => {
  if (!nameUtils.isValidName(domainName.toLowerCase())) {
    return {
      valid: false,
      error: 'Domains can use a mix of letters and numbers' // Domains can use a mix of letters and numbers
    }
  }
  if (!nameUtils.isValidLength(domainName)) {
    return {
      valid: false,
      error: 'Domains must be under 64 characters long'
    }
  }
  if (nameUtils.isTaken(domainName.toLowerCase())) {
    return {
      valid: false,
      error: 'This domain name is reserved for special purpose'
    }
  }
  if (nameUtils.isRestricted(domainName.toLocaleLowerCase())) {
    return {
      valid: false,
      error: `${domainName} contains a restricted phrase and can't be registered`
    }
  }
  return {
    valid: true,
    error: ''
  }
}
