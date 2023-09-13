import axios, { AxiosError } from "axios";
import config from "../../../config";
import { ChatConversation } from "../../types";
import { LlmCompletion } from "./liteLlm";

const API_ENDPOINT = config.llms.apiEndpoint;

export const vertexCompletion = async (
  conversation: ChatConversation[],
  model = config.llms.model
): Promise<LlmCompletion> => {
  try {
    const data = {
      model: model, //chat-bison@001 'chat-bison', //'gpt-3.5-turbo',
      stream: false,
      messages: conversation,
    };
    const url = `${API_ENDPOINT}/vertex/completions`;
    const response = await axios.post(url, data);
    if (response) {
      const totalInputTokens = 4; //response.data.usage.prompt_tokens;
      const totalOutputTokens = 5; // response.data.usage.completion_tokens;
      return {
        completion: {
          content: response.data,
          author: "bot",
          model: model,
        },
        usage: totalOutputTokens + totalInputTokens,
        price: 0,
      };
    }
    return {
      completion: undefined,
      usage: 0,
      price: 0,
    };
  } catch (error: any) {
    if (error instanceof AxiosError) {
      console.log(error.code);
      console.log(error.message);
      console.log(error.stack);
    }
    throw error;
  }
};
