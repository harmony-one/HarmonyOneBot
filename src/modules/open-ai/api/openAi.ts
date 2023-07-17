import {
  Configuration,
  OpenAIApi,
  CreateImageRequest,
  CreateCompletionRequest,
  CreateChatCompletionRequest,
} from "openai";

import config from "../../../config";
import { deleteFile, getImage } from "../utils/file";
import { bot } from "../../../bot";
import { AxiosError } from "axios";
import { ChatConversation } from "../../types";

const configuration = new Configuration({
  apiKey: config.openAiKey,
});

const openai = new OpenAIApi(configuration);

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
        //@ts-ignore
        response = await openai.createImageEdit(
          //@ts-ignore
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
          //@ts-ignore
          imageData.file,
          n > 10 ? 1 : n,
          size
        );
      }
      bot.api.sendMessage(chatId, "generating the output...");
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
  promptText: string,
  conversation: ChatConversation[],
  type: boolean
) {
  try {
    const payload = {
      model: config.openAi.imageGen.completions.model,
      // prompt: prompt,
      max_tokens: config.openAi.imageGen.completions.maxTokens,
      temperature: config.openAi.imageGen.completions.temperature,
      messages: [{ role: "user", content: promptText }],
    };
    const response = await openai.createChatCompletion(
      payload as CreateChatCompletionRequest
    );
    console.log(response.data.choices[0].message?.content);
    return response.data.choices[0].message?.content;
  } catch (e: any) {
    console.log(e.response);
    throw (
      e.response?.data.error.message ||
      "There was an error processing your request"
    );
  }
}

export async function improvePrompt(promptText: string) {
  const prompt = `Improve this picture description using max 100 words and don't add additional text to the image: ${promptText} `;
  try {
    return await chatCompilation(prompt, [], false);
  } catch (e: any) {
    console.log(e.response);
    throw (
      e.response?.data.error.message ||
      "There was an error processing your request"
    );
  }
}
