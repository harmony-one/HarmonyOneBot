import axios from 'axios'
import * as cheerio from 'cheerio'
import { getTokenNumber } from '../api/openAi'
import { pino } from 'pino'
// import { Kagi } from '../../voice-memo/kagi'
// import config from '../../../config'

const logger = pino({
  name: 'WebCrawler',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
})
interface WebContent {
  urlText: string
  elapsedTime: number
  networkTraffic: number
  fees: number
}

interface CrawlerElement {
  text: string
  tagName: string
}

const urlRegex =
  /^(https?:\/\/)?([\w.-]+\.[a-zA-Z]{2,}|[\w.-]+\.[a-zA-Z]{1,3}\.[a-zA-Z]{1,3})(\/\S*)?$/

export const isValidUrl = (url: string): boolean => {
  return urlRegex.test(url)
}

function parseWebContent (
  inputArray: CrawlerElement[],
  maxTokens: number
): string {
  let concatenatedText = ''
  let currentTokenCount = 0

  for (const item of inputArray) {
    if (item.tagName !== 'a' && item.tagName !== 'code') {
      const text = item.text
      const tokenCount = getTokenNumber(text)
      if (currentTokenCount + tokenCount <= maxTokens) {
        if (item.tagName === 'div' || item.tagName === 'p') {
          concatenatedText += text + '\n'
        } else {
          concatenatedText += text + ' '
        }
        currentTokenCount += tokenCount
      } else {
        break
      }
    }
  }
  return concatenatedText
}

export const getCrawlerPrice = async (
  networkTraffic: number
): Promise<number> => {
  const PRICE_PER_MB = 1
  networkTraffic = networkTraffic / 1048576 // convert to mb
  const finalPrice = PRICE_PER_MB * networkTraffic
  // console.log(networkTraffic, ": ", finalPrice)
  return +finalPrice.toFixed(2) // cents
}

// export const getWebContentKagi = async (
//   url: string
//   // maxTokens: number
// ): Promise<WebContent> => {
//   if (!url.startsWith('https://')) {
//     url = `https://${url}`
//   }
//   const kagi = new Kagi(config.voiceMemo.kagiApiKey)
//   const request = `https://harmony-webcrawler.fly.dev/parse?url=${url}`
//   logger.info(request)
//   const response = await kagi.getSummarization(request)
//   return {
//     urlText: response,
//     elapsedTime: 0, // result.elapsedTime,
//     networkTraffic: 0, // result.networkTraffic,
//     fees: 0.5, // await getCrawlerPrice(result.networkTraffic),
//     oneFees: 0.5
//   }
// }

export const getWebContent = async (
  url: string,
  maxTokens: number,
  username?: string,
  password?: string
): Promise<WebContent> => {
  if (!url.startsWith('https://')) {
    url = `https://${url}`
  }
  const credentials =
    username && password ? `&username=${username}&password=${password}` : ''
  const request = `https://harmony-webcrawler.fly.dev/parse?url=${url}${credentials}`
  logger.info(request)
  const response = await axios.get(request)
  const result = response.data
  logger.info(
      `Webcrawling ${url} => Tags processed: ${
        result.elements ? result.elements.length : 0
      }`
  )
  const text = parseWebContent(result.elements, maxTokens)

  return {
    urlText: text,
    elapsedTime: result.elapsedTime,
    networkTraffic: result.networkTraffic,
    fees: await getCrawlerPrice(result.networkTraffic)
  }
}

interface TelegramUserProfile {
  username: string
  displayName: string
  bio: string
}

export const getChatMemberInfo = async (
  username: string
): Promise<TelegramUserProfile> => {
  const url = `https://t.me/${username}`
  const response = await axios.get(url)
  const $ = cheerio.load(response.data)

  // Extract the display name
  const displayName = $('div.tgme_page_title').text().trim()

  // Extract the bio
  const bio = $('div.tgme_page_description').text().trim()

  return {
    username,
    displayName,
    bio
  }
}
