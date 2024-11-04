import axios, { AxiosError } from 'axios'
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
  prompt: string,
  loop = true
): Promise<LumaGenerationResponse> => {
  logger.info(`Handling luma generation for this prompt: "${prompt}"`)
  const data = {
    chat_id: chatId,
    prompt,
    loop
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

export const deleteGeneration = async (generationId: string): Promise<boolean> => {
  try {
    logger.info(`Deleting luma generation ${generationId}`)
    const url = `${API_ENDPOINT}/luma/generations/${generationId}`
    const response = await axios.delete(url, headers)
    if (response.status === 204) {
      logger.info(`Successfully deleted luma generation ${generationId}`)
      return true
    }
    logger.warn(`Unexpected response status ${response.status} when deleting generation ${generationId}`)
    return false
  } catch (e) {
    if (e instanceof AxiosError) {
      const status = e.response?.status
      if (status === 404) {
        logger.warn(`Generation ${generationId} not found`)
      } else if (status === 403) {
        logger.error(`Unauthorized to delete generation ${generationId}`)
      } else {
        logger.error(`Error deleting generation ${generationId}: ${e.message}`)
      }
    } else {
      logger.error(`Unexpected error deleting generation ${generationId}: ${e}`)
    }
    return false
  }
}
