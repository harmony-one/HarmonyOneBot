import axios from 'axios'
import { pino } from 'pino'
import { LumaAI } from 'lumaai'
import config from '../../../config'
import { headers } from './helper'

const logger = pino({
  name: 'luma - LumaBot',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
})

const lumaClient = new LumaAI({ authToken: config.luma.apiKey })

const API_ENDPOINT = config.llms.apiEndpoint

export interface LumaGenerationResponse {
  gnerationId: string
  generationInProgress: string
  queueTime: string
}

export const lumaGeneration = async (
  chatId: number,
  prompt: string
): Promise<LumaGenerationResponse> => {
  logger.info(`Handling luma generation for this prompt: "${prompt}"`)
  const data = {
    chat_id: chatId,
    prompt
  }
  const url = `${API_ENDPOINT}/luma/generations`
  const response = await axios.post(url, data, headers)
  const respJson = response.data
  return {
    gnerationId: respJson.generation_id,
    generationInProgress: respJson.in_progress,
    queueTime: respJson.queue_time
  }
}

export const getGeneration = async (generationId: string): Promise<LumaAI.Generations.Generation> => {
  const generation = await lumaClient.generations.get(generationId)
  return generation
}
