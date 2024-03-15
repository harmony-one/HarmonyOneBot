import axios from 'axios'
// import { type Readable } from 'stream'

import config from '../../../config'
import { type ChatConversation } from '../../types' // , type OnCallBackQueryData, type OnMessageContext,
import { type LlmCompletion } from './llmApi'
import { LlmsModelsEnum } from '../types'
// import { GrammyError } from 'grammy'
import { pino } from 'pino'

const logger = pino({
  name: 'anthropic - llmsBot',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
})

const API_ENDPOINT = config.llms.apiEndpoint // 'http://127.0.0.1:5000' // config.llms.apiEndpoint

export const anthropicCompletion = async (
  conversation: ChatConversation[],
  model = LlmsModelsEnum.CLAUDE_OPUS
): Promise<LlmCompletion> => {
  logger.info(`Handling ${model} completion`)

  const data = {
    model,
    stream: false,
    system: config.openAi.chatGpt.chatCompletionContext,
    max_tokens: +config.openAi.chatGpt.maxTokens,
    messages: conversation
  }
  const url = `${API_ENDPOINT}/anthropic/completions`
  const response = await axios.post(url, data)
  const respJson = JSON.parse(response.data)
  if (response) {
    const totalInputTokens = respJson.usage.input_tokens
    const totalOutputTokens = respJson.usage.output_tokens
    const completion = respJson.content

    return {
      completion: {
        content: completion[0].text,
        role: 'assistant',
        model
      },
      usage: totalOutputTokens + totalInputTokens,
      price: 0
    }
  }
  return {
    completion: undefined,
    usage: 0,
    price: 0
  }
}
// export const anthropicCompletion = async (
//   conversation: ChatConversation[],
//   model = LlmsModelsEnum.CLAUDE_OPUS,
//   ctx: OnMessageContext | OnCallBackQueryData,
//   msgId: number
// ): Promise<LlmCompletion> => {
//   const data = {
//     model,
//     stream: true, // Set stream to true to receive the completion as a stream
//     system: config.openAi.chatGpt.chatCompletionContext,
//     max_tokens: +config.openAi.chatGpt.maxTokens,
//     messages: conversation
//   }
//   let wordCount = 0
//   let wordCountMinimum = 2
//   const url = `${API_ENDPOINT}/anthropic/completions`
//   if (!ctx.chat?.id) {
//     throw new Error('Context chat id should not be empty after openAI streaming')
//   }
//   const response = await axios.post(url, data, { responseType: 'stream' })

//   // Create a Readable stream from the response
//   const completionStream: Readable = response.data

//   // Read and process the stream
//   let completion = ''
//   let outputTokens = ''
//   let inputTokens = ''
//   completionStream.on('data', (chunk: any) => {
//     const sendMessage = async (completion: string): Promise<void> => {
//       await ctx.api
//         .editMessageText(ctx.chat?.id, msgId, completion)
//         .catch(async (e: any) => {
//           if (e instanceof GrammyError) {
//             if (e.error_code !== 400) {
//               throw e
//             } else {
//               logger.error(e)
//             }
//           } else {
//             throw e
//           }
//         })
//     }
//     const msg = chunk.toString()
//     if (msg) {
//       if (msg.startsWith('Input Token')) {
//         inputTokens = msg.split('Input Token: ')[1]
//       } else if (msg.startsWith('Text')) {
//         wordCount++
//         completion += msg.split('Text: ')[1]
//         if (wordCount > wordCountMinimum) { // if (chunck === '.' && wordCount > wordCountMinimum) {
//           if (wordCountMinimum < 64) {
//             wordCountMinimum *= 2
//           }
//           completion = completion.replaceAll('...', '')
//           completion += '...'
//           wordCount = 0
//           if (ctx.chat?.id) {
//             await sendMessage(completion)
//           }
//         }
//       } else if (msg.startsWith('Output Tokens')) {
//         outputTokens = msg.split('Output Tokens: ')[1]
//       }
//     }
//   })

//   completionStream.on('end', () => {
//     const totalOutputTokens = outputTokens // response.headers['x-openai-output-tokens']
//     const totalInputTokens = inputTokens // response.headers['x-openai-input-tokens']
//     console.log('FCO stream', completion)
//     // You can also process the completion content here

//     return {
//       completion: {
//         content: completion,
//         role: 'assistant',
//         model
//       },
//       usage: parseInt(totalOutputTokens, 10) + parseInt(totalInputTokens, 10),
//       price: 0
//     }
//   })

//   return {
//     completion: undefined,
//     usage: 0,
//     price: 0
//   }
// }
