import config from '../../../config'
import { type OnCallBackQueryData, type OnMessageContext } from '../../types'

export const formatONEAmount = (num: number | string) => {
  const twoDecimalsFormatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    // @ts-expect-error
    maximumFractionDigits: num < 100 ? 2 : 0
  })

  return twoDecimalsFormatter.format(Number(num))
}

export const formatUSDAmount = (num: string | number) => {
  const twoDecimalsFormatter = new Intl.NumberFormat('en-US', {
    // @ts-expect-error
    minimumFractionDigits: num < 10 ? 2 : 0,
    maximumFractionDigits: 2
  })
  return twoDecimalsFormatter.format(Number(num))
}

export const getUrl = (url: string, fullUrl = true) => {
  if (url.endsWith('/')) {
    url = url.slice(0, url.length - 1)
  }
  if (url.startsWith('https://')) {
    url = url.slice('https://'.length)
  }
  return !url.includes('.country') && fullUrl
    ? url.concat(config.country.tld)
    : url
}

export const getCommandNamePrompt = (
  ctx: OnMessageContext | OnCallBackQueryData,
  supportedCommands: any
) => {
  const hasCommand = ctx.hasCommand(
    Object.values(supportedCommands).map((command: any) => command.name)
  )
  const commandName = hasCommand
    ? ctx.message?.text?.split(' ')[0].slice(1)
    : ''
  const prompt = hasCommand ? ctx.match || '' : ctx.message?.text || ''
  return {
    commandName,
    prompt
  }
}
