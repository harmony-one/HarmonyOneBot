import config from "../../config";
import { OnMessageContext, OnCallBackQueryData, MessageExtras } from "../types";
import { parse } from "path";
import { ParseMode } from "grammy/types";
// import { getChatModel, getChatModelPrice, getTokenNumber } from "./api/openAi";
import { ChatPayload } from "../types";

export const SupportedCommands = {
  palm: {
    name: "v"
  },
  bard: {
    name: "b"
  }
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

export const hasChatPrefix = (prompt: string): string => {
  const prefixList = config.openAi.chatGpt.prefixes.chatPrefix;
  for (let i = 0; i < prefixList.length; i++) {
    if (prompt.toLocaleLowerCase().startsWith(prefixList[i])) {
      return prefixList[i];
    }
  }
  return "";
};

export const hasDallePrefix = (prompt: string): string => {
  const prefixList = config.openAi.chatGpt.prefixes.dallePrefix;
  for (let i = 0; i < prefixList.length; i++) {
    if (prompt.toLocaleLowerCase().startsWith(prefixList[i])) {
      return prefixList[i];
    }
  }
  return "";
};

export const hasNewPrefix = (prompt: string): string => {
  const prefixList = config.openAi.chatGpt.prefixes.newPrefix;
  for (let i = 0; i < prefixList.length; i++) {
    if (prompt.toLocaleLowerCase().startsWith(prefixList[i])) {
      return prefixList[i];
    }
  }
  return "";
};

export const hasUrl = (
  ctx: OnMessageContext | OnCallBackQueryData,
  prompt: string
) => {
  const urls = ctx.entities("url");
  let url = "";
  let newPrompt = "";
  if (urls.length > 0) {
    const { text } = urls[0];
    url = text;
    newPrompt = prompt.replace(url, "");
    return {
      url,
      newPrompt,
    };
  }
  return {
    url,
    newPrompt: prompt,
  };
};

export const hasUsernamePassword = (prompt: string) => {
  let user = "";
  let password = "";
  const parts = prompt.split(" ");

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].toLowerCase();
    if (part.includes("=")) {
      const [keyword, value] = parts[i].split("=");
      if (keyword === "user" || keyword === "username") {
        user = value;
      } else if (keyword === "password" || keyword === "pwd") {
        password = value;
      }
      if (user !== "" && password !== "") {
        break;
      }
    } else if (part === "user") {
      user = parts[i + 1];
    } else if (part === "password") {
      password = parts[i + 1];
    }
  }
  return { user, password };
};

// doesn't get all the special characters like !
export const hasUserPasswordRegex = (prompt: string) => {
  const pattern =
    /\b(user=|password=|user|password)\s*([^\s]+)\b.*\b(user=|password=|user|password)\s*([^\s]+)\b/i;
  const matches = pattern.exec(prompt);

  let user = "";
  let password = "";

  if (matches) {
    const [_, keyword, word, __, word2] = matches;
    if (keyword.toLowerCase() === "user" || keyword.toLowerCase() === "user=") {
      user = word;
      password = word2;
    } else if (
      keyword.toLowerCase() === "password" ||
      keyword.toLowerCase() === "password="
    ) {
      password = word;
      user = word2;
    }
  }
  return { user, password };
};

export const preparePrompt = async (
  ctx: OnMessageContext | OnCallBackQueryData,
  prompt: string
) => {
  const msg = await ctx.message?.reply_to_message?.text;
  if (msg) {
    return `${prompt} ${msg}`;
  }
  return prompt;
};

export const messageTopic = async (
  ctx: OnMessageContext | OnCallBackQueryData
) => {
  return await ctx.message?.message_thread_id;
};

interface GetMessagesExtras {
  parseMode?: ParseMode | undefined;
  caption?: string | undefined;
  replyId?: number | undefined;
}

export const getMessageExtras = (params: GetMessagesExtras) => {
  const { parseMode, caption, replyId } = params;
  let extras: MessageExtras = {};
  if (parseMode) {
    extras["parse_mode"] = parseMode;
  }
  if (replyId) {
    extras["reply_to_message_id"] = replyId;
  }
  if (caption) {
    extras["caption"] = caption;
  }
  return extras;
};

export const sendMessage = async (
  ctx: OnMessageContext | OnCallBackQueryData,
  msg: string,
  msgExtras?: GetMessagesExtras
) => {
  let extras: MessageExtras = {};
  if (msgExtras) {
    extras = getMessageExtras(msgExtras);
  }
  const topicId = ctx.message?.message_thread_id;

  if (topicId) {
    extras["message_thread_id"] = topicId
  }
  
  return await ctx.reply(msg, extras);
};

export const hasPrefix = (prompt: string): string => {
  return (
    hasChatPrefix(prompt) || hasDallePrefix(prompt) || hasNewPrefix(prompt)
  );
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
