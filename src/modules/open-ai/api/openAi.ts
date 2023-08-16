import {
  Configuration,
  OpenAIApi,
  CreateImageRequest,
  CreateChatCompletionRequest,
  ChatCompletionRequestMessage,
} from "openai";
import { encode } from "gpt-tokenizer";
import { OpenAIExt, ServerStreamChatCompletionConfig } from "openai-ext";
import { Readable } from "stream"; // Import the Readable class

import config from "../../../config";
import { deleteFile, getImage } from "../utils/file";
import { bot } from "../../../bot";
import { ChatCompletion, ChatConversation, OnCallBackQueryData, OnMessageContext } from "../../types";
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
      n: numImgs ? numImgs : config.openAi.imageGen.sessionDefault.numImages,
      size: imgSize ? imgSize : config.openAi.imageGen.sessionDefault.imgSize,
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
  numImages?: number,
  imgSize?: string
) {
  try {
    const imageData = await getImage(filePath);
    if (!imageData.error) {
      bot.api.sendMessage(chatId, "validating image... ");
      let response;
      const size = imgSize
        ? imgSize
        : config.openAi.imageGen.sessionDefault.imgSize;
      if (isNaN(+prompt)) {
        const n = numImages
          ? numImages
          : config.openAi.imageGen.sessionDefault.numImages;

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
          : config.openAi.imageGen.sessionDefault.imgSize;
        const n = parseInt(prompt);
        response = await openai.createImageVariation(
          imageData.file,
          n > 10 ? 1 : n,
          size
        );
      }
      bot.api.sendMessage(chatId, "Generating...");
      deleteFile(imageData.fileName!);
      return response.data.data;
    } else {
      bot.api.sendMessage(chatId, imageData.error);
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
      max_tokens: limitTokens
        ? config.openAi.imageGen.completions.maxTokens
        : undefined,
      temperature: config.openAi.imageGen.completions.temperature,
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
  // model = config.openAi.chatGpt.model,
  // limitTokens = true,
  ctx: OnMessageContext | OnCallBackQueryData,
  msgId: number
): Promise<ChatCompletion> => {
  console.time("chatCompletion");
  let completion = ''
  let wordCount = 0;
  let i = 1
  const streamConfig: ServerStreamChatCompletionConfig = {
    openai,
    handler: {
      // Content contains the string draft, which may be partial. When isFinal is true, the completion is done.
      async onContent(content: string, isFinal: boolean, stream: any) {
        if (isFinal) {
          await ctx.api.editMessageText(ctx.chat?.id!, msgId, content).catch((e:any) => console.log(e));
        } else if (completion !== content) {

          const wordsInChunk = content.trim().split(/\s+/).length;
          console.log(wordsInChunk,content)
          wordCount += wordsInChunk;
          completion = content
          
          if (wordCount >= 5000 * i) {
            i++
            console.log(wordCount, i)
            await ctx.api.editMessageText(ctx.chat?.id!, msgId, content).catch((e:any) => console.log(e));
          }
        }
      },
      onDone(stream: any) {
        console.log('Done!');
        console.log(completion)
      },
      onError(error: any, stream: any) {
        console.error(error);
      },
    },
  };

  await OpenAIExt.streamServerChatCompletion(
    {
      model: "gpt-3.5-turbo",
      messages: conversation,
      // max_tokens: 512,
    },
    streamConfig
  );

  return {
    completion: completion, // response.data.choices[0].message?.content!,
    usage: 30, //response.data.usage?.total_tokens!,
    price: 10 //price * config.openAi.chatGpt.priceAdjustment,
  };
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




  // await new Promise(resolve => setTimeout(resolve, 10000))
  // const response: any = await openai.createChatCompletion(
  //   {
  //     model: "gpt-3.5-turbo",
  //     stream: true,
  //     messages: conversation as ChatCompletionRequestMessage[],
  //     // max_tokens: 512,
  //     temperature: 0.9,
  //   },
  //   { responseType: "stream" }
  // );
  // for await (const part of response) {
  //   console.log(part.choices[0]?.delta?.content || '');
  // }
  // process.stdout.write('\n');

  
  // let msg = "";
  // let wordCount = 0;
  // response.data.on("data", async (chunk: Buffer) => {
  //   // console.log(chunk);
  //   const chunkStr = chunk.toString(); // Convert the chunk to a string
  //   const jsonStartIndex = chunkStr.indexOf('data: {');
  //   if (jsonStartIndex !== -1) {
  //     const jsonChunk = chunkStr.slice(jsonStartIndex + 6); // Extract the JSON content after 'data: '
  //     try {
  //       const parsedChunk = JSON.parse(jsonChunk);
  //       if (parsedChunk && parsedChunk.choices && parsedChunk.choices.length > 0) {
  //         const chunkContent = parsedChunk.choices[0].delta.content;
  //         msg += chunkContent;

  //         const wordsInChunk = chunkContent.trim().split(/\s+/).length;
  //         wordCount += wordsInChunk;

  //         if (wordCount >= 60) {
  //           await ctx.api.editMessageText(ctx.chat?.id!, msgId, msg);
  //           wordCount = 0; // Reset word count
  //           // await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for 1 second
  //         }
  //       }
  //     } catch (error) {
  //       console.error("Error parsing JSON chunk:", error);
  //     }
  //   }
  // });
  // return new Promise<ChatCompletion>((resolve) => {
  //   response.data.on("end", async () => {
  //     const chatModel = getChatModel("gpt-3.5-turbo");
  //     const price = getChatModelPrice(
  //       chatModel,
  //       true,
  //       response.data.usage?.prompt_tokens!,
  //       response.data.usage?.completion_tokens
  //     );
  //     await ctx.api.editMessageText(ctx.chat?.id!, msgId, msg).catch((e:any) => {
  //       console.log(e)
  //     });
  //     resolve({
  //       completion: msg,
  //       usage: response.data.usage?.total_tokens!,
  //       price: price * config.openAi.chatGpt.priceAdjustment,
  //     }); // Resolve the promise with the completion text
  //   });
  // });