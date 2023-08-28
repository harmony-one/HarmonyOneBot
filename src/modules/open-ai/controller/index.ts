import { pino } from "pino";
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

export const imgGen = async (
  data: ImageGenPayload,
  ctx: OnMessageContext | OnCallBackQueryData
) => {
  const { chatId, prompt, numImages, imgSize } = data;
  try {
    const imgs = await postGenerateImg(prompt, numImages, imgSize);
    imgs.map(async (img: any) => {
      await ctx
        .replyWithPhoto(img.url, {
          caption: `/DALLE ${prompt}`,
        })
        .catch((e) => {
          throw e;
        });
    });
    return true;
  } catch (e: any) {
    throw e;
  }
};

export const imgGenEnhanced = async (
  data: ImageGenPayload,
  ctx: OnMessageContext | OnCallBackQueryData
) => {
  const { chatId, prompt, numImages, imgSize, model } = data;
  try {
    const upgratedPrompt = await improvePrompt(prompt, model!);
    if (upgratedPrompt) {
      await ctx
        .reply(
          `The following description was added to your prompt: ${upgratedPrompt}`
        )
        .catch((e) => {
          throw e;
        });
    }
    // bot.api.sendMessage(chatId, "generating the output...");
    const imgs = await postGenerateImg(
      upgratedPrompt || prompt,
      numImages,
      imgSize
    );
    imgs.map(async (img: any) => {
      await ctx
        .replyWithPhoto(img.url, {
          caption: `/DALLE ${upgratedPrompt || prompt}`,
        })
        .catch((e) => {
          throw e;
        });
    });
    return true;
  } catch (e) {
    throw e;
  }
};

export const alterImg = async (
  data: ImageGenPayload,
  ctx: OnMessageContext | OnCallBackQueryData
) => {
  const { chatId, prompt, numImages, imgSize, filePath } = data;
  try {
    ctx.chatAction = "upload_photo";
    const imgs = await alterGeneratedImg(
      prompt!,
      filePath!,
      ctx,
      imgSize!
    );
    if (imgs) {
      imgs!.map(async (img: any) => {
        await ctx.replyWithPhoto(img.url).catch((e) => {
          throw e;
        });
      });
    }
    ctx.chatAction = null;
  } catch (e) {
    throw e;
  }
};

export const promptGen = async (data: ChatGptPayload) => {
  const { conversation, ctx, model } = data;
  try {
    let msgId = (await ctx.reply("...")).message_id;
    const isTypingEnabled = config.openAi.chatGpt.isTypingEnabled;
    if (isTypingEnabled) {
      ctx.chatAction = "typing";
    }
    const completion = await streamChatCompletion(
      conversation!,
      ctx,
      model,
      msgId,
      true // telegram messages has a character limit
    );
    if (isTypingEnabled) {
      ctx.chatAction = null;
    }
    if (completion) {
      const prompt = conversation[conversation.length - 1].content;
      const promptTokens = getTokenNumber(prompt);
      const completionTokens = getTokenNumber(completion);
      const modelPrice = getChatModel(model);
      const price =
        getChatModelPrice(modelPrice, true, promptTokens, completionTokens) *
        config.openAi.chatGpt.priceAdjustment;
      logger.info(
        `streamChatCompletion result = tokens: ${
          promptTokens + completionTokens
        } | ${modelPrice.name} | price: ${price}¢`
      );
      conversation.push({ content: completion, role: "system" });
      ctx.session.openAi.chatGpt.usage += promptTokens + completionTokens;
      ctx.session.openAi.chatGpt.price += price;
      ctx.session.openAi.chatGpt.chatConversation = [...conversation!];
      return price;
    }
    return 0;
  } catch (e: any) {
    ctx.chatAction = null;
    throw e;
  }
};
