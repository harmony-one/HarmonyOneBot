import config from "../../config";
import {
  OnMessageContext,
  OnCallBackQueryData,
  MessageExtras,
  ChatConversation,
} from "../types";
import { parse } from "path";
import { ParseMode } from "grammy/types";
// import { getChatModel, getChatModelPrice, getTokenNumber } from "./api/openAi";
import { ChatPayload } from "../types";
import { LlmsModelsEnum } from "./types";

export const SupportedCommands = {
  palm: {
    name: "v",
  },
  bard: {
    name: "b",
  },
};

export const MAX_TRIES = 3;

export const isMentioned = (
  ctx: OnMessageContext | OnCallBackQueryData
): boolean => {
  if (ctx.entities()[0]) {
    const { offset, text } = ctx.entities()[0];
    const { username } = ctx.me;
    if (username === text.slice(1) && offset === 0) {
      const prompt = ctx.message?.text!.slice(text.length);
      if (prompt && prompt.split(" ").length > 0) {
        return true;
      }
    }
  }
  return false;
};


export const hasPrefix = (prompt: string): string => {
  return (
    hasBardPrefix(prompt)
  );
};

export const hasBardPrefix = (prompt: string): string => {
  const prefixList = config.llms.prefixes.bardPrefix;
  for (let i = 0; i < prefixList.length; i++) {
    if (prompt.toLocaleLowerCase().startsWith(prefixList[i])) {
      return prefixList[i];
    }
  }
  return "";
};

export const getPromptPrice = (completion: string, data: ChatPayload) => {
  return {
    price: 0,
    promptTokens: 10,
    completionTokens: 60,
  };
};

export const limitPrompt = (prompt: string) => {
  const wordCountPattern = /(\d+)\s*word(s)?/g;
  const match = wordCountPattern.exec(prompt);

  if (match) {
    return `${prompt}`;
  }

  return `${prompt} in around ${config.openAi.chatGpt.wordLimit} words`;
};

export const prepareConversation = (
  conversation: ChatConversation[],
  model: string
) => {
  return conversation
    .filter((msg) => msg.model === model)
    .map((msg) => {
      const msgFiltered: ChatConversation = {
        content: msg.content,
      };
      if (model === LlmsModelsEnum.BISON) {
        msgFiltered["author"] = msg.author;
      } else {
        msgFiltered["role"] = msg.role;
      }
      return msgFiltered;
    });
};
