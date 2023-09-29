import axios, { AxiosError } from "axios";
import config from "../../../config";
import { ChatConversation, OnCallBackQueryData, OnMessageContext } from "../../types";

const API_ENDPOINT = 'http://127.0.0.1:5000' //config.llms.apiEndpoint;
export interface LlmCompletion {
  completion: ChatConversation | undefined;
  usage: number;
  price: number;
}

export const llmAddUrlDocument = async (ctx: OnMessageContext | OnCallBackQueryData, chatId: number, url: string) => {
  try {
    const data = {
      chatId: `${chatId}`,
      url: url
    };
    const endpointUrl = `${API_ENDPOINT}/collections/document`;
    console.log(endpointUrl, data)
    const response = await axios.post(endpointUrl, data);
    if (response) {
      console.log(response.data)
    }
  } catch (error: any) {
    if (error instanceof AxiosError) {
      console.log(error.code);
      console.log(error.message);
      console.log(error.stack);
    }
    throw error;
  }
}

export const llmCompletion = async (
  conversation: ChatConversation[],
  model = config.llms.model
): Promise<LlmCompletion> => {
  try {
    const data = {
      model: model, //chat-bison@001 'chat-bison', //'gpt-3.5-turbo',
      stream: false,
      messages: conversation,
    };
    const url = `${API_ENDPOINT}/llms/completions`;
    const response = await axios.post(url, data);

    if (response) {
      const totalInputTokens = response.data.usage.prompt_tokens;
      const totalOutputTokens = response.data.usage.completion_tokens;
      const completion = response.data.choices;
      return {
        completion: {
          content: completion[0].message?.content!,
          role: "system",
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
    // if (error instanceof AxiosError) {
    //   console.log(error.code);
    //   console.log(error.message);
    //   console.log(error.stack);
    // }
    throw error;
  }
};


export const llmWebCrawler = async (
  prompt: string,
  model: string,
  chadId: number, 
  msgId: number,
  url: string
): Promise<LlmCompletion> => {
  try {
    if (!url.startsWith("https://")) {
      url = `https://${url}`;
    }
    const data = {
      prompt: prompt,
      chatId: ""+chadId,
      msgId: ""+msgId,
      token: ""+config.telegramBotAuthToken,
      url: url
    };
    console.log(url)
    const urlApi = `${API_ENDPOINT}/llama-index/text`;
    const response = await axios.post(urlApi, data);
    if (response.data) {
      const totalInputTokens = 0 // response.data.usage.prompt_tokens;
      const totalOutputTokens = 0 // response.data.usage.completion_tokens;
      const completion = response.data
      return {
        completion: {
          content: completion ?? '',
          role: "system",
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
    console.log('ERROR FLAG')
    throw error;
  }
};
