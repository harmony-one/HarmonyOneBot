import OpenAI from "openai";
import { encode } from "gpt-tokenizer";
import { GrammyError } from "grammy";

import config from "../../../config";
import { deleteFile, getImage } from "../utils/file";
import {
  ChatCompletion,
  ChatConversation,
  OnCallBackQueryData,
  OnMessageContext,
} from "../../types";
import { pino } from "pino";
import {
  ChatGPTModel,
  ChatGPTModels,
  DalleGPTModel,
  DalleGPTModels,
} from "../types";
import { getMessageExtras } from "../helpers";

const openai = new OpenAI({
  apiKey: config.openAiKey,
});

const logger = pino({
  name: "openAIBot",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
  },
});

export async function postGenerateImg(
  prompt: string,
  numImgs?: number,
  imgSize?: string
) {
  try {
    const payload = {
      prompt: prompt,
      n: numImgs ? numImgs : config.openAi.dalle.sessionDefault.numImages,
      size: imgSize ? imgSize : config.openAi.dalle.sessionDefault.imgSize,
    };
    const response = await openai.images.generate(
      payload as OpenAI.Images.ImageGenerateParams
    );
    return response.data;
  } catch (error) {
    throw error;
  }
}

export async function alterGeneratedImg(
  prompt: string,
  filePath: string,
  ctx: OnMessageContext | OnCallBackQueryData,
  imgSize?: string
) {
  try {
    const imageData = await getImage(filePath);
    if (!imageData.error) {
      let response;
      const size = imgSize
        ? imgSize
        : config.openAi.dalle.sessionDefault.imgSize;
      if (!isNaN(+prompt)) {
        const size = imgSize
          ? imgSize
          : config.openAi.dalle.sessionDefault.imgSize;
        const n = parseInt(prompt);
        const payLoad: OpenAI.Images.ImageCreateVariationParams = {
          image: imageData.file as any,
          n: n > 10 ? 1 : n,
          // size
        };
        response = await openai.images.createVariation(payLoad);
      }
      deleteFile(imageData.fileName!);
      return response?.data;
    } else {
      await ctx.reply(imageData.error).catch((e) => {
        throw e;
      });
      return null;
    }
  } catch (error: any) {
    throw error;
  }
}

export async function chatCompletion(
  conversation: ChatConversation[],
  model = config.openAi.chatGpt.model,
  limitTokens = true
): Promise<ChatCompletion> {
  try {
    const payload = {
      model: model,
      max_tokens: limitTokens ? config.openAi.chatGpt.maxTokens : undefined,
      temperature: config.openAi.dalle.completions.temperature,
      messages: conversation,
    };
    const response = await openai.chat.completions.create(
      payload as OpenAI.Chat.CompletionCreateParamsNonStreaming
    );
    const chatModel = getChatModel(model);
    const price = getChatModelPrice(
      chatModel,
      true,
      response.usage?.prompt_tokens!,
      response.usage?.completion_tokens
    );
    return {
      completion: response.choices[0].message?.content!,
      usage: response.usage?.total_tokens!,
      price: price * config.openAi.chatGpt.priceAdjustment,
    };
  } catch (e: any) {
    throw e;
  }
}

export const streamChatCompletion = async (
  conversation: ChatConversation[],
  ctx: OnMessageContext | OnCallBackQueryData,
  model = config.openAi.chatGpt.model,
  msgId: number,
  limitTokens = true
): Promise<string> => {
  try {
    let completion = "";
    const wordCountMinimum = config.openAi.chatGpt.wordCountBetween;
    return new Promise<string>(async (resolve, reject) => {
      try {
        const stream = await openai.chat.completions.create({
          model: model,
          messages:
            conversation as OpenAI.Chat.Completions.CreateChatCompletionRequestMessage[],
          stream: true,
          max_tokens: limitTokens ? config.openAi.chatGpt.maxTokens : undefined,
          temperature: config.openAi.dalle.completions.temperature,
        });
        let wordCount = 0;

        for await (const part of stream) {
          wordCount++;
          const chunck = part.choices[0]?.delta?.content
            ? part.choices[0]?.delta?.content
            : "";
          completion += chunck;
          // if (wordCount > 20) {
          //   throw getGrammy429Error()
          // }
          if (chunck === "." && wordCount > wordCountMinimum) {
            completion = completion.replaceAll("..", "");
            completion += "..";
            wordCount = 0;
            await ctx.api
              .editMessageText(ctx.chat?.id!, msgId, completion)
              .catch(async (e: any) => {
                if (e instanceof GrammyError) {
                  if (e.error_code !== 400) {
                    reject(e);
                  } else {
                    logger.error(e);
                  }
                } else {
                  reject(e);
                }
              });
          }
        }
        completion = completion.replaceAll("..", "");
        await ctx.api
          .editMessageText(ctx.chat?.id!, msgId, completion)
          .catch((e: any) => {
            if (e instanceof GrammyError) {
              if (e.error_code !== 400) {
                reject(e);
              } else {
                logger.error(e);
              }
            } else {
              reject(e);
            }
          });
        resolve(completion);
      } catch (e) {
        reject(e);
      }
    });
  } catch (error: any) {
    return Promise.reject(error);
  }
};

export async function improvePrompt(promptText: string, model: string) {
  const prompt = `Improve this picture description using max 100 words and don't add additional text to the image: ${promptText} `;
  try {
    const conversation = [{ role: "user", content: prompt }];
    const response = await chatCompletion(conversation, model);
    return response.completion;
  } catch (e: any) {
    throw e;
  }
}

export const getTokenNumber = (prompt: string) => {
  return encode(prompt).length;
};

export const getChatModel = (modelName: string) => {
  return ChatGPTModels[modelName];
};

export const getChatModelPrice = (
  model: ChatGPTModel,
  inCents = true,
  inputTokens: number,
  outPutTokens?: number
) => {
  let price = model.inputPrice * inputTokens;
  price += outPutTokens
    ? outPutTokens * model.outputPrice
    : model.maxContextTokens * model.outputPrice;
  price = inCents ? price * 100 : price;
  return price / 1000;
};

export const getDalleModel = (modelName: string) => {
  logger.info(modelName);
  return DalleGPTModels[modelName];
};

export const getDalleModelPrice = (
  model: DalleGPTModel,
  inCents = true,
  numImages = 1,
  hasEnhacedPrompt = false,
  chatModel?: ChatGPTModel
) => {
  let price = model.price * numImages || 0;
  if (hasEnhacedPrompt && chatModel) {
    const averageToken = 250; // for 100 words
    price += getChatModelPrice(chatModel, inCents, averageToken, averageToken);
  }
  return price;
};

function getGrammy429Error() {
  return new GrammyError(
    "GrammyError: Call to 'sendMessage' failed! (429: Too Many Requests: retry after 33)",
    {
      ok: false,
      error_code: 429,
      description: "Too Many Requests: retry after 33",
    } as any,
    "editMessageText",
    {
      parameters: { retry_after: 33 },
    }
  );
}
