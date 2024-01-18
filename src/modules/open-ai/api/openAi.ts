import OpenAI from 'openai'
import { encode } from 'gpt-tokenizer'
import { GrammyError } from 'grammy'
import config from '../../../config'
import { deleteFile, getImage } from '../utils/file'
import {
  type ChatCompletion,
  type ChatConversation,
  type OnCallBackQueryData,
  type OnMessageContext
} from '../../types'
import { pino } from 'pino'
import {
  type ChatModel,
  ChatGPTModels,
  type DalleGPTModel,
  DalleGPTModels,
  ChatGPTModelsEnum
} from '../types'
import type fs from 'fs'
import { type ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { type Stream } from 'openai/streaming'

const openai = new OpenAI({ apiKey: config.openAiKey })

const logger = pino({
  name: 'openAIBot',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
})

export async function postGenerateImg (
  prompt: string,
  numImgs?: number,
  imgSize?: string
): Promise<OpenAI.Images.Image[]> {
  const payload = {
    model: config.openAi.dalle.sessionDefault.model,
    quality: config.openAi.dalle.sessionDefault.quality,
    prompt,
    n: numImgs ?? config.openAi.dalle.sessionDefault.numImages,
    size: imgSize ?? config.openAi.dalle.sessionDefault.imgSize
  }
  const response = await openai.images.generate(
    payload as OpenAI.Images.ImageGenerateParams
  )
  console.log(response)
  return response.data
}

export async function alterGeneratedImg (
  prompt: string,
  filePath: string,
  ctx: OnMessageContext | OnCallBackQueryData,
  imgSize?: string
): Promise<OpenAI.Images.Image[] | null | undefined> {
  const imageData = await getImage(filePath)
  if (!imageData.error) {
    let response
    // const size = imgSize ?? config.openAi.dalle.sessionDefault.imgSize
    if (!isNaN(+prompt)) {
      // const size2 = imgSize ?? config.openAi.dalle.sessionDefault.imgSize
      const n = parseInt(prompt)
      const payLoad: OpenAI.Images.ImageCreateVariationParams = {
        image: imageData.file,
        n: n > 10 ? 1 : n
        // size
      }
      response = await openai.images.createVariation(payLoad)
    }
    deleteFile(imageData.fileName)
    return response?.data
  } else {
    await ctx.reply(imageData.error).catch((e) => {
      throw e
    })
    return null
  }
}

export async function chatCompletion (
  conversation: ChatConversation[],
  model = config.openAi.chatGpt.model,
  limitTokens = true
): Promise<ChatCompletion> {
  const response = await openai.chat.completions.create({
    model,
    max_tokens: limitTokens ? config.openAi.chatGpt.maxTokens : undefined,
    temperature: config.openAi.dalle.completions.temperature,
    messages: conversation as ChatCompletionMessageParam[]
  })
  const chatModel = getChatModel(model)
  if (response.usage?.prompt_tokens === undefined) {
    throw new Error('Unknown number of prompt tokens used')
  }
  const price = getChatModelPrice(
    chatModel,
    true,
    response.usage?.prompt_tokens,
    response.usage?.completion_tokens
  )
  return {
    completion: response.choices[0].message?.content ?? 'Error - no completion available',
    usage: response.usage?.total_tokens,
    price: price * config.openAi.chatGpt.priceAdjustment
  }
}

export const streamChatCompletion = async (
  conversation: ChatConversation[],
  ctx: OnMessageContext | OnCallBackQueryData,
  model = config.openAi.chatGpt.model,
  msgId: number,
  limitTokens = true
): Promise<string> => {
  let completion = ''
  let wordCountMinimum = 2
  const stream = await openai.chat.completions.create({
    model,
    messages: conversation as ChatCompletionMessageParam[], // OpenAI.Chat.Completions.CreateChatCompletionRequestMessage[],
    stream: true,
    max_tokens: limitTokens ? config.openAi.chatGpt.maxTokens : undefined,
    temperature: config.openAi.dalle.completions.temperature || 0.8
  })
  let wordCount = 0
  if (!ctx.chat?.id) {
    throw new Error('Context chat id should not be empty after openAI streaming')
  }
  // let wordCountMinimumCounter = 1;
  for await (const part of stream) {
    wordCount++
    const chunck = part.choices[0]?.delta?.content
      ? part.choices[0]?.delta?.content
      : ''
    completion += chunck
    // if (wordCount > 20) {
    //   throw getGrammy429Error()
    // }
    if (wordCount > wordCountMinimum) { // if (chunck === '.' && wordCount > wordCountMinimum) {
      if (wordCountMinimum < 64) {
        wordCountMinimum *= 2
      }
      completion = completion.replaceAll('...', '')
      completion += '...'
      wordCount = 0
      await ctx.api
        .editMessageText(ctx.chat?.id, msgId, completion)
        .catch(async (e: any) => {
          if (e instanceof GrammyError) {
            if (e.error_code !== 400) {
              throw e
            } else {
              logger.error(e)
            }
          } else {
            throw e
          }
        })
    }
  }
  completion = completion.replaceAll('...', '')

  await ctx.api
    .editMessageText(ctx.chat?.id, msgId, completion)
    .catch((e: any) => {
      if (e instanceof GrammyError) {
        if (e.error_code !== 400) {
          throw e
        } else {
          logger.error(e)
        }
      } else {
        throw e
      }
    })
  return completion
}

export const streamChatVisionCompletion = async (
  ctx: OnMessageContext | OnCallBackQueryData,
  model = ChatGPTModelsEnum.GPT_4_VISION_PREVIEW,
  prompt: string,
  imgUrls: string[],
  msgId: number,
  limitTokens = true
): Promise<string> => {
  let completion = ''
  let wordCountMinimum = 2
  const payload: any = {
    model,
    messages: [
      {
        role: 'system',
        content: config.openAi.chatGpt.visionCompletionContext
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          ...imgUrls.map(img => ({
            type: 'image_url',
            image_url: { url: img }
          }))
        ]
      }
    ],
    stream: true,
    max_tokens: limitTokens ? config.openAi.chatGpt.maxTokens : undefined
  }
  const stream = await openai.chat.completions.create(payload) as unknown as Stream<OpenAI.Chat.Completions.ChatCompletionChunk>
  let wordCount = 0
  if (!ctx.chat?.id) {
    throw new Error('Context chat id should not be empty after openAI streaming')
  }
  for await (const part of stream) {
    wordCount++
    const chunck = part.choices[0]?.delta?.content
      ? part.choices[0]?.delta?.content
      : ''
    completion += chunck

    if (wordCount > wordCountMinimum) {
      if (wordCountMinimum < 64) {
        wordCountMinimum *= 2
      }
      completion = completion.replaceAll('...', '')
      completion += '...'
      wordCount = 0
      await ctx.api
        .editMessageText(ctx.chat?.id, msgId, completion)
        .catch(async (e: any) => {
          if (e instanceof GrammyError) {
            if (e.error_code !== 400) {
              throw e
            } else {
              logger.error(e)
            }
          } else {
            throw e
          }
        })
    }
  }
  completion = completion.replaceAll('...', '')

  await ctx.api
    .editMessageText(ctx.chat?.id, msgId, completion)
    .catch((e: any) => {
      if (e instanceof GrammyError) {
        if (e.error_code !== 400) {
          throw e
        } else {
          logger.error(e)
        }
      } else {
        throw e
      }
    })
  return completion
}

export async function improvePrompt (promptText: string, model: string): Promise<string> {
  const prompt = `Improve this picture description using max 100 words and don't add additional text to the image: ${promptText} `

  const conversation = [{ role: 'user', content: prompt }]
  const response = await chatCompletion(conversation, model)
  return response.completion
}

export const getTokenNumber = (prompt: string): number => {
  return encode(prompt).length
}

export const getChatModel = (modelName: string): ChatModel => {
  return ChatGPTModels[modelName]
}

export const getChatModelPrice = (
  model: ChatModel,
  inCents = true,
  inputTokens: number,
  outPutTokens?: number
): number => {
  let price = model.inputPrice * inputTokens
  price += outPutTokens
    ? outPutTokens * model.outputPrice
    : model.maxContextTokens * model.outputPrice
  price = inCents ? price * 100 : price
  return price / 1000
}

export const getDalleModel = (modelName: string): DalleGPTModel => {
  logger.info(modelName)
  return DalleGPTModels[modelName]
}

export const getDalleModelPrice = (
  model: DalleGPTModel,
  inCents = true,
  numImages = 1,
  hasEnhacedPrompt = false,
  chatModel?: ChatModel
): number => {
  let price = model.price * numImages || 0
  if (hasEnhacedPrompt && chatModel) {
    const averageToken = 250 // for 100 words
    price += getChatModelPrice(chatModel, inCents, averageToken, averageToken)
  }
  return price
}

export function getGrammy429Error (): GrammyError {
  return new GrammyError(
    "GrammyError: Call to 'sendMessage' failed! (429: Too Many Requests: retry after 33)",
    {
      ok: false,
      error_code: 429,
      description: 'Too Many Requests: retry after 33'
    } as any,
    'editMessageText',
    { parameters: { retry_after: 33 } }
  )
}

export async function speechToText (readStream: fs.ReadStream): Promise<string> {
  const result = await openai.audio.transcriptions.create({
    file: readStream,
    model: 'whisper-1'
  })

  return result.text
}
