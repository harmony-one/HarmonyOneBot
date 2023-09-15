import axios from 'axios'
import { randomBytes } from 'crypto'
import config from '../../config'

const rand = () => randomBytes(4).toString('hex')

export const uuidv4 = () => {
  return [1, 2, 3, 4].map(() => rand()).join('-')
}

export const sleep = async (ms: number) => await new Promise(res => setTimeout(res, ms))

export const getTelegramFileUrl = (filePath: string) => {
  return `https://api.telegram.org/file/bot${config.telegramBotAuthToken}/${filePath}`
}

export const loadFile = async (url: string) => {
  return await axios
    .get(url, { responseType: 'arraybuffer' })
    .then(response => Buffer.from(response.data, 'binary'))
}
