import { ChatModel } from "../open-ai/types";

export enum LlmsModelsEnum {
  GPT_4_32K = "gpt-4-32k",
  BISON = "chat-bison",
}

export const LlmsModels: Record<string, ChatModel> = {
  "chat-bison": {
    name: "chat-bison",
    inputPrice: 0.03,
    outputPrice: 0.06,
    maxContextTokens: 8192,
    chargeType: "CHAR",
  },
  "gpt-4-32k": {
    name: "gpt-4-32k",
    inputPrice: 0.06,
    outputPrice: 0.12,
    maxContextTokens: 32000,
    chargeType: "TOKEN",
  },
};
