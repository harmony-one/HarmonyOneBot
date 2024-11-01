import axios, { AxiosError } from 'axios'
import config from '../../../config'
import { type ChatConversation } from '../../types'
import { headers } from './helper'

export interface PdfCompletion {
  completion: ChatConversation | undefined
  prompt: string
  price: number
}

export const handlePdf = async (prompt: string): Promise<PdfCompletion> => {
  try {
    const data = { question: prompt }
    const url = `${config.llms.pdfUrl}/ask`
    const response = await axios.post(url, data, headers)
    if (response) {
      console.log(response.data)
      return {
        completion: {
          content: response.data.response,
          role: 'system',
          timestamp: Date.now()
        },
        prompt,
        price: response.data.cost
      }
    }
    return {
      completion: undefined,
      prompt,
      price: 0
    }
  } catch (error: any) {
    if (error instanceof AxiosError) {
      console.log(error.code)
      console.log(error.message)
      console.log(error.stack)
    }
    throw error
  }
}
