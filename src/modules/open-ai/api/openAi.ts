import OpenAI from "openai";
import { encode } from "gpt-tokenizer";

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

// export async function alterGeneratedImg(
//   chatId: number,
//   prompt: string,
//   filePath: string,
//   ctx: OnMessageContext | OnCallBackQueryData,
//   numImages?: number,
//   imgSize?: string
// ) {
//   try {
//     const imageData = await getImage(filePath);
//     if (!imageData.error) {
//       let response;
//       const size = imgSize
//         ? imgSize
//         : config.openAi.dalle.sessionDefault.imgSize;
//       if (isNaN(+prompt)) {
//         const n = numImages
//           ? numImages
//           : config.openAi.dalle.sessionDefault.numImages;

//         // response = await openai.images.edit(
//         //   imageData.file,
//         //   prompt,
//         //   undefined,
//         //   n,
//         //   size
//         // );
//       } else {
//         const size = imgSize
//           ? imgSize
//           : config.openAi.dalle.sessionDefault.imgSize;
//         const n = parseInt(prompt);
//         response = await openai.images.createVariation({
//           image: imageData.file,
//           n > 10 ? 1 : n,
//           size

//         }

//         );
//       }
//       deleteFile(imageData.fileName!);
//       return response?.data;
//     } else {
//       ctx.reply(imageData.error);
//       return null;
//     }
//   } catch (error: any) {
//     throw error;
//   }
// }

export async function chatCompilation(
  conversation: ChatConversation[],
  model = config.openAi.chatGpt.model,
  limitTokens = true
): Promise<ChatCompletion> {
  try {
    const payload = {
      model: model,
      max_tokens: limitTokens ? config.openAi.maxTokens : undefined,
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
    logger.error(e.response);
    throw (
      e.response?.data.error.message ||
      "There was an error processing your request"
    );
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
    const payload = {
      model: model,
      max_tokens: limitTokens ? config.openAi.maxTokens : undefined,
      temperature: config.openAi.dalle.completions.temperature,
      messages: conversation,
      stream: true,
    };
    let completion = "";
    return new Promise<string>(async (resolve, reject) => {
      try {
        const stream = await openai.chat.completions.create({
          model: model,
          messages:
            conversation as OpenAI.Chat.Completions.CreateChatCompletionRequestMessage[],
          stream: true,
        });
        let wordCount = 0;

        for await (const part of stream) {
          wordCount++;
          const chunck = part.choices[0]?.delta?.content
            ? part.choices[0]?.delta?.content
            : "";
          completion += chunck;
          if (chunck === "." && wordCount > 100) {
            completion = completion.replaceAll("..", "");
            completion += "..";
            wordCount = 0;
            ctx.api
              .editMessageText(ctx.chat?.id!, msgId, completion)
              .catch((e: any) => console.log(e));
          }
        }
        completion = completion.replaceAll("..", "");
        ctx.api
          .editMessageText(ctx.chat?.id!, msgId, completion)
          .catch((e: any) => console.log(e));
        resolve(completion);
      } catch (error) {
        reject(
          `streamChatCompletion: An error occurred during OpenAI request: ${error}`
        );
      }
    });
  } catch (error: any) {
    return Promise.reject(
      `streamChatCompletion: An error occurred during OpenAI request: ${error}`
    );
  }
};

export async function improvePrompt(promptText: string, model: string) {
  const prompt = `Improve this picture description using max 100 words and don't add additional text to the image: ${promptText} `;
  try {
    const conversation = [{ role: "user", content: prompt }];
    const response = await chatCompilation(conversation, model);
    return response.completion;
  } catch (e: any) {
    logger.error(e.response);
    throw (
      e.response?.data.error.message ||
      "There was an error processing your request"
    );
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
