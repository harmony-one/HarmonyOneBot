import {
  Configuration,
  OpenAIApi,
  CreateImageRequest,
  CreateChatCompletionRequest,
} from "openai";
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

const configuration = new Configuration({
  apiKey: config.openAiKey,
});

const openai = new OpenAIApi(configuration);

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
    const response = await openai.createImage(payload as CreateImageRequest);
    return response.data.data;
  } catch (error) {
    throw error;
  }
}

export async function alterGeneratedImg(
  chatId: number,
  prompt: string,
  filePath: string,
  ctx: OnMessageContext | OnCallBackQueryData,
  numImages?: number,
  imgSize?: string
) {
  try {
    const imageData = await getImage(filePath);
    if (!imageData.error) {
      let response;
      const size = imgSize
        ? imgSize
        : config.openAi.dalle.sessionDefault.imgSize;
      if (isNaN(+prompt)) {
        const n = numImages
          ? numImages
          : config.openAi.dalle.sessionDefault.numImages;

        response = await openai.createImageEdit(
          imageData.file,
          prompt,
          undefined,
          n,
          size
        );
      } else {
        const size = imgSize
          ? imgSize
          : config.openAi.dalle.sessionDefault.imgSize;
        const n = parseInt(prompt);
        response = await openai.createImageVariation(
          imageData.file,
          n > 10 ? 1 : n,
          size
        );
      }
      deleteFile(imageData.fileName!);
      return response.data.data;
    } else {
      ctx.reply(imageData.error);
      return null;
    }
  } catch (error: any) {
    throw error;
  }
}

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
    const response = await openai.createChatCompletion(
      payload as CreateChatCompletionRequest
    );
    const chatModel = getChatModel(model);
    const price = getChatModelPrice(
      chatModel,
      true,
      response.data.usage?.prompt_tokens!,
      response.data.usage?.completion_tokens
    );
    return {
      completion: response.data.choices[0].message?.content!,
      usage: response.data.usage?.total_tokens!,
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
        const res = await openai.createChatCompletion(
          payload as CreateChatCompletionRequest,
          { responseType: "stream" }
        );
        let wordCount = 0;
        //@ts-ignore
        res.data.on("data", async (data: any) => {
          const lines = data
            .toString()
            .split("\n")
            .filter((line: string) => line.trim() !== "");
          for (const line of lines) {
            const message = line.replace(/^data: /, "");
            if (message === "[DONE]") {
              completion = completion.replaceAll("..", "");
              if (!completion.endsWith(".")) {
                if (msgId === 0) {
                  msgId = (await ctx.reply(completion)).message_id;
                  resolve(completion);
                  return;
                }
              }
              await ctx.api
                .editMessageText(ctx.chat?.id!, msgId, completion)
                .catch((e: any) => console.log(e));
              // const msgIdEnd = (
              //   await ctx.reply(`_done_`, {
              //     // with ${ctx.session.openAi.chatGpt.model.toLocaleUpperCase()}
              //     parse_mode: "Markdown",
              //   })
              // ).message_id;
              // ctx.api.deleteMessage(ctx.chat?.id!, msgId); // msgIdEnd);
              // ctx.reply(completion);
              resolve(completion);
              return;
            }
            wordCount++;
            try {
              const parsed = JSON.parse(message);
              completion +=
                parsed.choices[0].delta.content !== undefined
                  ? parsed.choices[0].delta.content
                  : "";
              if (parsed.choices[0].delta.content === ".") {
                if (msgId === 0) {
                  // msgId = (await ctx.reply(completion)).message_id;
                  // ctx.chatAction = "typing";
                } else if (wordCount > 20) {
                  completion = completion.replaceAll("..", "");
                  completion += "..";
                  wordCount = 0;
                  ctx.api
                    .editMessageText(ctx.chat?.id!, msgId, completion)
                    .catch((e: any) => console.log(e));
                }
              }
            } catch (error) {
              logger.error(
                "Could not JSON parse stream message",
                message,
                error
              );
              // reject(`An error occurred during OpenAI request: ${error}`);
            }
          }
        });
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
