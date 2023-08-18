import { pino } from "pino";
import { bot } from "../../../bot";
import {
  ChatConversation,
  OnCallBackQueryData,
  OnMessageContext,
} from "../../types";
import {
  improvePrompt,
  postGenerateImg,
  alterGeneratedImg,
  streamChatCompletion,
  getTokenNumber,
  getChatModel,
  getChatModelPrice,
} from "../api/openAi";
import config from "../../../config";

interface ImageGenPayload {
  chatId: number;
  prompt: string;
  numImages?: number;
  imgSize?: string;
  filePath?: string;
  model?: string;
}

interface ChatGptPayload {
  conversation: ChatConversation[];
  model: string;
  ctx: OnMessageContext | OnCallBackQueryData;
}

const logger = pino({
  name: "openAI-controller",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
  },
});

export const imgGen = async (data: ImageGenPayload) => {
  const { chatId, prompt, numImages, imgSize } = data;
  try {
    bot.api.sendMessage(chatId, "generating the output...");
    const imgs = await postGenerateImg(prompt, numImages, imgSize);
    imgs.map((img: any) => {
      bot.api.sendPhoto(chatId, img.url);
    });
    return true;
  } catch (e) {
    logger.error("/gen Error", e);
    bot.api.sendMessage(
      chatId,
      "There was an error while generating the image"
    );
    return false;
  }
};

export const imgGenEnhanced = async (data: ImageGenPayload) => {
  const { chatId, prompt, numImages, imgSize, model } = data;
  try {
    const upgratedPrompt = await improvePrompt(prompt, model!);
    if (upgratedPrompt) {
      bot.api.sendMessage(
        chatId,
        `The following description was added to your prompt: ${upgratedPrompt}`
      );
    }
    bot.api.sendMessage(chatId, "generating the output...");
    const imgs = await postGenerateImg(
      upgratedPrompt || prompt,
      numImages,
      imgSize
    );
    imgs.map((img: any) => {
      bot.api.sendPhoto(chatId, img.url);
    });
    return true;
  } catch (e) {
    bot.api.sendMessage(
      chatId,
      `There was an error while generating the image: ${e}`
    );
    return false;
  }
};

export const alterImg = async (data: ImageGenPayload) => {
  const { chatId, prompt, numImages, imgSize, filePath } = data;
  try {
    const imgs = await alterGeneratedImg(
      chatId,
      prompt!,
      filePath!,
      numImages!,
      imgSize!
    );
    imgs!.map((img: any) => {
      bot.api.sendPhoto(chatId, img.url);
    });
  } catch (e) {
    logger.error("alterImg Error", e);
    bot.api.sendMessage(
      chatId,
      "There was an error while generating the image"
    );
    return false;
  }
};

export const promptGen = async (data: ChatGptPayload) => {
  const { conversation, ctx, model } = data;
  try {
    const completion = await streamChatCompletion(
      conversation!,
      ctx,
      model,
      false
    );
    if (completion) {
      const prompt = conversation[conversation.length - 1].content;
      const promptTokens = getTokenNumber(prompt);
      const completionTokens = getTokenNumber(completion);
      const modelPrice = getChatModel(model);
      const price = getChatModelPrice(
        modelPrice,
        true,
        promptTokens,
        completionTokens
      ) * config.openAi.chatGpt.priceAdjustment;
      logger.info(`"${prompt}" | tokens: ${promptTokens + completionTokens} | ${modelPrice.name} | price: ${price}`)
      conversation.push({ content: completion, role: "system" });
      ctx.session.openAi.chatGpt.usage += promptTokens + completionTokens;
      ctx.session.openAi.chatGpt.price += price;
      ctx.session.openAi.chatGpt.chatConversation = [...conversation!];
      return price 
    }
    return 0
  } catch (e) {
    logger.error("promptGen Error", e);
    throw "There was an error while generating the image";
  }
};
