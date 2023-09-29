import axios from 'axios'
import { randomBytes } from 'crypto'
import config from '../../config'

const rand = (): string => randomBytes(4).toString('hex')

export const uuidv4 = (): string => {
  return [1, 2, 3, 4].map(() => rand()).join('-')
}

export const sleep = async (ms: number): Promise<unknown> => await new Promise(resolve => {
  setTimeout(resolve, ms)
})

export const getTelegramFileUrl = (filePath: string): string => {
  return `https://api.telegram.org/file/bot${config.telegramBotAuthToken}/${filePath}`
}

export const loadFile = async (url: string): Promise<Buffer> => {
  return await axios
    .get(url, { responseType: 'arraybuffer' })
    .then(response => Buffer.from(response.data, 'binary'))
}
