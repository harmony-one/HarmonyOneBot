import { Configuration, 
  OpenAIApi, 
  CreateImageRequest, 
  CreateCompletionRequest, 
  CreateChatCompletionRequest} from "openai";

import config from "../../../config";
import { deleteFile, getImage } from "../utils/file";
import { bot } from "../../../bot";
import { AxiosError } from "axios";

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
      n: numImgs ? numImgs : config.imageGen.sessionDefault.numImages,
      size: imgSize ? imgSize : config.imageGen.sessionDefault.imgSize,
    };
    const response = await openai.createImage(payload as CreateImageRequest)
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
      bot.api.sendMessage(chatId,"validating image... ");
      let response;
      const size = imgSize ? imgSize : config.imageGen.sessionDefault.imgSize;
      if (isNaN(+prompt)) {
        const n = numImages ? numImages : config.imageGen.sessionDefault.numImages;
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
        const size = imgSize ? imgSize : config.imageGen.sessionDefault.imgSize;
        const n = parseInt(prompt)
        response = await openai.createImageVariation(
          //@ts-ignore
          imageData.file,
          n > 10 ? 1 : n,
          size
        );
      }
      bot.api.sendMessage(chatId,"generating the output...");
      deleteFile(imageData.fileName!)
      return response.data.data;
    } else {
      bot.api.sendMessage(chatId,imageData.error)
    }
  } catch (error: any) {
    throw error;
  }
}

export async function improvePrompt(promptText: string) {
  const prompt = `Improve this picture description using max 100 words and don't add additional text to the image: ${promptText} `;
  try {
    const payload = {
      model: config.imageGen.completions.model,
      // prompt: prompt,
      max_tokens: config.imageGen.completions.maxTokens,
      temperature: config.imageGen.completions.temperature,
      messages:[{"role": "user", "content": prompt}] //'Translate the following English text to French: "{text}"'}]
    };
    const response = await openai.createChatCompletion(payload as CreateChatCompletionRequest); 
    console.log(response.data.choices)
    return 'locura' // response.data.choices[0].text;
  } catch (e: any) {
    console.log("DGHSGDJHHFGHJGSJFGJSHGSJFG SHG HJF SFSG", e instanceof AxiosError ? e.response?.data.error : 'PIODJSODOISFOISOIF SUFIOSUOFUFIOSIUFSOIUFFU OSIUF SIOF U PUPU')
    console.log(e.response)
    // e instanceof AxiosError
    //      ? e.response?.data.error
    //      : "There was an error processing your request"
    throw e 
  }
}
