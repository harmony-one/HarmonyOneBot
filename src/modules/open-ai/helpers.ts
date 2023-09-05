import config from "../../config";
import { isValidUrl } from "./utils/web-crawler";
import { OnMessageContext, OnCallBackQueryData } from "../types";

export const SupportedCommands = {
  chat: {
    name: "chat",
  },
  ask: {
    name: "ask",
  },
  sum: {
    name: "sum",
  },
  ask35: {
    name: "ask35",
  },
  new: {
    name: "new",
  },
  gpt4: {
    name: "gpt4",
  },
  gpt: {
    name: "gpt",
  },
  last: {
    name: "last",
  },
  dalle: {
    name: "DALLE",
  },
  dalleLC: {
    name: "dalle",
  },
  genImgEn: {
    name: "genImgEn",
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

export const hasUrl = (prompt: string) => {
  const promptArray = prompt.split(" ");
  let url = "";
  for (let i = 0; i < promptArray.length; i++) {
    if (isValidUrl(promptArray[i])) {
      url = promptArray[i];
      promptArray.splice(i, 1);
      break;
    }
  }
  return {
    url,
    newPrompt: promptArray.join(" "),
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
}

// doesn't get all the special characters like !
export const hasUserPasswordRegex = (prompt: string) => {
  const pattern =
    /\b(user=|password=|user|password)\s*([^\s]+)\b.*\b(user=|password=|user|password)\s*([^\s]+)\b/i;
  const matches = pattern.exec(prompt);

  let user = "";
  let password = "";

  if (matches) {
    const [_, keyword, word, __, word2] = matches;
    if (
      keyword.toLowerCase() === "user" ||
      keyword.toLowerCase() === "user="
    ) {
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
}

export const preparePrompt = async (
  ctx: OnMessageContext | OnCallBackQueryData,
  prompt: string
) => {
  const msg = await ctx.message?.reply_to_message?.text;
  if (msg) {
    return `${prompt} ${msg}`;
  }
  return prompt;
}

export const messageTopic = async (ctx: OnMessageContext | OnCallBackQueryData) => {
  return await ctx.message?.message_thread_id
}

export const sendMessage = async (ctx: OnMessageContext | OnCallBackQueryData, msg: string) => {
  const topic = await messageTopic(ctx)
  if (topic) {
    ctx.reply(msg, {
      message_thread_id: topic,
      parse_mode: 'Markdown'
    })
  }
}

export const hasPrefix = (prompt: string): string => {
  return (
    hasChatPrefix(prompt) || hasDallePrefix(prompt) || hasNewPrefix(prompt)
  );
};
