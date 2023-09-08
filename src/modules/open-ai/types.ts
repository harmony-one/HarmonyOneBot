import {
  ChatConversation,
  OnCallBackQueryData,
  OnMessageContext,
} from "../types";

export interface ChatGPTModel {
  name: string;
  inputPrice: number;
  outputPrice: number;
  maxContextTokens: number;
}

export interface DalleGPTModel {
  size: string;
  price: number;
}

export interface ChatGptPayload {
  conversation: ChatConversation[];
  model: string;
  ctx: OnMessageContext | OnCallBackQueryData;
}

export enum ChatGPTModelsEnum {
  GPT_4 = "gpt-4",
  GPT_4_32K = "gpt-4-32k",
  GPT_35_TURBO = "gpt-3.5-turbo",
  GPT_35_TURBO_16K = "gpt-3.5-turbo-16k",
}

export const ChatGPTModels: Record<string, ChatGPTModel> = {
  "gpt-4": {
    name: "gpt-4",
    inputPrice: 0.03,
    outputPrice: 0.06,
    maxContextTokens: 8192,
  },
  "gpt-4-32k": {
    name: "gpt-4-32k",
    inputPrice: 0.06,
    outputPrice: 0.12,
    maxContextTokens: 32000,
  },
  "gpt-3.5-turbo": {
    name: "gpt-3.5-turbo",
    inputPrice: 0.0015,
    outputPrice: 0.002,
    maxContextTokens: 4000,
  },
  "gpt-3.5-turbo-16k": {
    name: "gpt-3.5-turbo-16k",
    inputPrice: 0.003,
    outputPrice: 0.004,
    maxContextTokens: 16000,
  },
};

export const DalleGPTModels: Record<string, DalleGPTModel> = {
  "1024x1024": {
    size: "1024x1024",
    price: 0.02,
  },
  "512x512": {
    size: "512x512",
    price: 0.018,
  },
  "256x256": {
    size: "256x256",
    price: 0.016,
  },
};
