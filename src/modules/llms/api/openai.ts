import OpenAI from 'openai'
import { encode } from 'gpt-tokenizer'
import { GrammyError } from 'grammy'
import config from '../../../config'
import { deleteFile, getImage } from '../utils/file'
import {
  type ChatConversation,
  type OnCallBackQueryData,
  type OnMessageContext
} from '../../types'
import { pino } from 'pino'
import {
  type ImageModel,
  type ChatModel,
  type DalleImageSize,
  type ModelParameters
} from '../utils/types'
import type fs from 'fs'
import { type ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { type Stream } from 'openai/streaming'
import { getChatModel, getChatModelPrice, type LlmCompletion } from './llmApi'
import { LlmModelsEnum } from '../utils/llmModelsManager'

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

type ConversationOutput = Omit<ChatConversation, 'timestamp' | 'model' | 'id' | 'author' | 'numSubAgents'>

export const prepareConversation = (conversation: ChatConversation[], model: string, ctx: OnMessageContext | OnCallBackQueryData): ConversationOutput[] => {
  const messages = conversation.filter(c => c.model === model).map(m => { return { content: m.content, role: m.role } })
  if (messages.length !== 1 || model === LlmModelsEnum.O1) {
    return messages
  }
  const systemMessage = {
    role: 'system',
    content: ctx.session.currentPrompt
  }
  return [systemMessage, ...messages]
}

export async function chatCompletion (
  conversation: ChatConversation[],
  model = config.openAi.chatGpt.model,
  ctx: OnMessageContext | OnCallBackQueryData,
  limitTokens = true,
  parameters?: ModelParameters
): Promise<LlmCompletion> {
  const messages = prepareConversation(conversation, model, ctx)
  parameters = parameters ?? {
    max_completion_tokens: config.openAi.chatGpt.maxTokens,
    temperature: config.openAi.dalle.completions.temperature
  }
  const response = await openai.chat.completions.create({
    model,
    messages: messages as ChatCompletionMessageParam[],
    max_completion_tokens: limitTokens ? parameters.max_completion_tokens : undefined,
    temperature: parameters.temperature
  })
  const chatModel = getChatModel(model)
  if (response.usage?.prompt_tokens === undefined) {
    throw new Error('Unknown number of prompt tokens used')
  }
  const price = chatModel
    ? getChatModelPrice(
      chatModel,
      true,
      response.usage?.prompt_tokens,
      response.usage?.completion_tokens
    )
    : 0
  const inputTokens = response.usage?.prompt_tokens
  const outputTokens = response.usage?.completion_tokens
  return {
    completion: {
      content: response.choices[0].message?.content ?? 'Error - no completion available',
      role: 'assistant',
      timestamp: Date.now()
    },
    usage: response.usage?.total_tokens, // 2010
    price: price * config.openAi.chatGpt.priceAdjustment,
    inputTokens,
    outputTokens
  }
}

export const streamChatCompletion = async (
  conversation: ChatConversation[],
  model = LlmModelsEnum.GPT_4,
  ctx: OnMessageContext | OnCallBackQueryData,
  msgId: number,
  limitTokens = true,
  parameters?: ModelParameters
): Promise<LlmCompletion> => {
  let completion = ''
  let wordCountMinimum = 2
  const messages = prepareConversation(conversation, model, ctx)
  parameters = parameters ?? {
    max_completion_tokens: config.openAi.chatGpt.maxTokens,
    temperature: config.openAi.dalle.completions.temperature || 0.8
  }
  const stream = await openai.chat.completions.create({
    model,
    messages: messages as ChatCompletionMessageParam[], // OpenAI.Chat.Completions.CreateChatCompletionRequestMessage[],
    stream: true,
    max_completion_tokens: limitTokens ? parameters.max_completion_tokens : undefined,
    temperature: parameters.temperature
  })
  let wordCount = 0
  if (!ctx.chat?.id) {
    throw new Error('Context chat id should not be empty after openAI streaming')
  }
  // let wordCountMinimumCounter = 1;
  let message = ''
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
      if (message !== completion) {
        message = completion
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
  }
  completion = completion.replaceAll('...', '')
  const inputTokens = getTokenNumber(conversation[conversation.length - 1].content as string) + ctx.session.chatGpt.usage
  const outputTokens = getTokenNumber(completion)
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
  return {
    completion: {
      content: completion,
      role: 'assistant',
      timestamp: Date.now()
    },
    usage: outputTokens + inputTokens,
    price: 0,
    inputTokens,
    outputTokens
  }
}

export const streamChatVisionCompletion = async (
  ctx: OnMessageContext | OnCallBackQueryData,
  model = LlmModelsEnum.GPT_4O, // GPT_4_VISION => Deprecated
  prompt: string,
  imgUrls: string[],
  msgId: number,
  limitTokens = true
): Promise<LlmCompletion> => {
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
  const inputTokens = getTokenNumber(prompt) + ctx.session.chatGpt.usage
  const outputTokens = getTokenNumber(completion)
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
  return {
    completion: {
      content: completion,
      role: 'assistant',
      timestamp: Date.now()
    },
    usage: outputTokens + inputTokens,
    price: 0,
    inputTokens,
    outputTokens
  }
}

export async function improvePrompt (promptText: string, model: string, ctx: OnMessageContext | OnCallBackQueryData): Promise<string> {
  const prompt = `Improve this picture description using max 100 words and don't add additional text to the image: ${promptText} `
  const conversation = [{ role: 'user', content: prompt, timestamp: Date.now() }]
  const response = await chatCompletion(conversation, model, ctx)
  return response.completion?.content as string ?? ''
}

export const getTokenNumber = (prompt: string): number => {
  return encode(prompt).length
}

export const getDalleModelPrice = (
  model: ImageModel,
  size: DalleImageSize,
  inCents = true,
  numImages = 1,
  hasEnhacedPrompt = false,
  chatModel?: ChatModel
): number => {
  const modelPrice = model.price[size]
  let price = modelPrice * numImages || 0
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

// const testText = `
// Yes, according to theoretical physics, black holes are predicted to produce thermal radiation due to quantum effects near their event horizons. This phenomenon is known as **Hawking radiation**, named after physicist Stephen Hawking, who first proposed it in 1974.
// ### **Hawking Radiation and Black Hole Thermodynamics**

// While classical general relativity suggests that nothing can escape a black hole, quantum mechanics introduces a different perspective. In quantum field theory, the uncertainty principle allows for particle-antiparticle pairs to spontaneously appear near the event horizon of a black hole. One of these particles can fall into the black hole while the other escapes, leading to a net loss of mass-energy from the black hole. This process makes the black hole appear as if it is emitting radiation.

// ### **Mathematical Description Using Functions**

// #### **Black Hole Temperature**

// The temperature \( T \) of a non-rotating, non-charged (Schwarzschild) black hole is given by the Hawking temperature formula:

// \[
// T = \frac{\hbar c^3}{8\pi G M k_B}
// \]

// Where:

// - \( \hbar \) is the reduced Planck constant (\( \hbar = \frac{h}{2\pi} \approx 1.055 \times 10^{-34} \ \text{J} \cdot \text{s} \))
// - \( c \) is the speed of light in a vacuum (\( c \approx 3.00 \times 10^8 \ \text{m/s} \))
// - \( G \) is the gravitational constant (\( G \approx 6.674 \times 10^{-11} \ \text{N} \cdot \text{m}^2/\text{kg}^2 \))
// - \( M \) is the mass of the black hole
// - \( k_B \) is the Boltzmann constant (\( k_B \approx 1.381 \times 10^{-23} \ \text{J/K} \))

// This equation shows that the black hole's temperature is **inversely proportional** to its mass:

// \[
// T \propto \frac{1}{M}
// \]

// #### **Black Hole Luminosity**

// The power \( P \) radiated by the black hole can be approximated using the Stefan-Boltzmann law for blackbody radiation:

// \[
// P = A \sigma T^4
// \]

// Where:

// - \( A \) is the surface area of the black hole's event horizon
// - \( \sigma \) is the Stefan-Boltzmann constant (\( \sigma \approx 5.670 \times 10^{-8} \ \text{W}/\text{m}^2\text{K}^4 \))
// - \( T \) is the Hawking temperature

// The surface area \( A \) of the black hole is:

// \[
// A = 4\pi r_s^2
// \]

// The Schwarzschild radius \( r_s \) is given by:

// \[
// r_s = \frac{2GM}{c^2}
// \]

// Combining these equations:

// \[
// A = 4\pi \left( \frac{2GM}{c^2} \right)^2
// \]

// Substitute \( A \) and \( T \) back into the power equation to find \( P \) as a function of the black hole mass \( M \):

// \[
// P = 4\pi \left( \frac{2GM}{c^2} \right)^2 \sigma \left( \frac{\hbar c^3}{8\pi G M k_B} \right)^4
// \]

// Simplify the equation to show how power depends on mass:

// \[
// P \propto \frac{1}{M^2}
// \]

// This inverse square relationship indicates that as the black hole loses mass (through Hawking radiation), it becomes hotter and emits radiation more rapidly.

// ### **Implications and Observational Challenges**

// - **Black Hole Evaporation:** Over astronomical timescales, Hawking radiation leads to the gradual loss of mass from a black hole, potentially resulting in complete evaporation.

// - **Temperature Estimates:** For stellar-mass black holes (about the mass of our Sun), the Hawking temperature is extremely low, around \( 10^{-8} \) Kelvin, making the emitted radiation virtually undetectable.

// - **Micro Black Holes:** Hypothetical tiny black holes (with masses much smaller than a stellar mass) would have higher temperatures and could emit significant amounts of radiation before evaporating completely.

// ### **Current Status**

// - **Experimental Evidence:** As of the knowledge cutoff in 2023, Hawking radiation has not been observed directly due to its incredibly weak signal compared to cosmic background radiation and other sources.

// - **Theoretical Significance:** Hawking radiation is a crucial concept in theoretical physics because it links quantum mechanics, general relativity, and thermodynamics, providing insights into the fundamental nature of gravity and spacetime.

// ### **Conclusion**

// Black holes are theoretically predicted to produce thermal radiation as a result of quantum effects near their event horizons. This radiation, characterized by the Hawking temperature, implies that black holes are not entirely black but emit energy over time. While direct detection remains a challenge, Hawking radiation is a significant prediction that continues to influence research in quantum gravity and cosmology.
// Yes, according to theoretical physics, black holes are predicted to produce thermal radiation due to quantum effects near their event horizons. This phenomenon is known as **Hawking radiation**, named after physicist Stephen Hawking, who first proposed it in 1974.
// ### **Hawking Radiation and Black Hole Thermodynamics**

// While classical general relativity suggests that nothing can escape a black hole, quantum mechanics introduces a different perspective. In quantum field theory, the uncertainty principle allows for particle-antiparticle pairs to spontaneously appear near the event horizon of a black hole. One of these particles can fall into the black hole while the other escapes, leading to a net loss of mass-energy from the black hole. This process makes the black hole appear as if it is emitting radiation.

// ### **Mathematical Description Using Functions**

// #### **Black Hole Temperature**

// The temperature \( T \) of a non-rotating, non-charged (Schwarzschild) black hole is given by the Hawking temperature formula:

// \[
// T = \frac{\hbar c^3}{8\pi G M k_B}
// \]

// Where:

// - \( \hbar \) is the reduced Planck constant (\( \hbar = \frac{h}{2\pi} \approx 1.055 \times 10^{-34} \ \text{J} \cdot \text{s} \))
// - \( c \) is the speed of light in a vacuum (\( c \approx 3.00 \times 10^8 \ \text{m/s} \))
// - \( G \) is the gravitational constant (\( G \approx 6.674 \times 10^{-11} \ \text{N} \cdot \text{m}^2/\text{kg}^2 \))
// - \( M \) is the mass of the black hole
// - \( k_B \) is the Boltzmann constant (\( k_B \approx 1.381 \times 10^{-23} \ \text{J/K} \))

// This equation shows that the black hole's temperature is **inversely proportional** to its mass:

// \[
// T \propto \frac{1}{M}
// \]

// #### **Black Hole Luminosity**

// The power \( P \) radiated by the black hole can be approximated using the Stefan-Boltzmann law for blackbody radiation:

// \[
// P = A \sigma T^4
// \]

// Where:

// - \( A \) is the surface area of the black hole's event horizon
// - \( \sigma \) is the Stefan-Boltzmann constant (\( \sigma \approx 5.670 \times 10^{-8} \ \text{W}/\text{m}^2\text{K}^4 \))
// - \( T \) is the Hawking temperature

// The surface area \( A \) of the black hole is:

// \[
// A = 4\pi r_s^2
// \]

// The Schwarzschild radius \( r_s \) is given by:

// \[
// r_s = \frac{2GM}{c^2}
// \]

// Combining these equations:

// \[
// A = 4\pi \left( \frac{2GM}{c^2} \right)^2
// \]

// Substitute \( A \) and \( T \) back into the power equation to find \( P \) as a function of the black hole mass \( M \):

// \[
// P = 4\pi \left( \frac{2GM}{c^2} \right)^2 \sigma \left( \frac{\hbar c^3}{8\pi G M k_B} \right)^4
// \]

// Simplify the equation to show how power depends on mass:

// \[
// P \propto \frac{1}{M^2}
// \]

// This inverse square relationship indicates that as the black hole loses mass (through Hawking radiation), it becomes hotter and emits radiation more rapidly.

// ### **Implications and Observational Challenges**

// - **Black Hole Evaporation:** Over astronomical timescales, Hawking radiation leads to the gradual loss of mass from a black hole, potentially resulting in complete evaporation.

// - **Temperature Estimates:** For stellar-mass black holes (about the mass of our Sun), the Hawking temperature is extremely low, around \( 10^{-8} \) Kelvin, making the emitted radiation virtually undetectable.

// - **Micro Black Holes:** Hypothetical tiny black holes (with masses much smaller than a stellar mass) would have higher temperatures and could emit significant amounts of radiation before evaporating completely.

// ### **Current Status**

// - **Experimental Evidence:** As of the knowledge cutoff in 2023, Hawking radiation has not been observed directly due to its incredibly weak signal compared to cosmic background radiation and other sources.

// - **Theoretical Significance:** Hawking radiation is a crucial concept in theoretical physics because it links quantum mechanics, general relativity, and thermodynamics, providing insights into the fundamental nature of gravity and spacetime.

// ### **Conclusion**
// `
