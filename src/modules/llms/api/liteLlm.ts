import axios, { AxiosError } from "axios";
import config from "../../../config";
import { ChatConversation } from "../../types";

const API_ENDPOINT = config.llms.apiEndpoint;

export interface LlmCompletion {
  completion: ChatConversation | undefined
  usage: number
  price: number
}

export const llmCompletion = async (
  conversation: ChatConversation[],
  model = config.llms.model
): Promise<LlmCompletion> => {
  try {
    const data = 
        {
          model: model, //chat-bison@001 'chat-bison', //'gpt-3.5-turbo',
          stream: false,
          messages: conversation,
        }    
    const url = `${API_ENDPOINT}/chat/completions`
    const response = await axios.post(url, data);

    if (response) {
      const totalInputTokens = 4 //response.data.usage.prompt_tokens;  
      const totalOutputTokens = 5 // response.data.usage.completion_tokens;
      // const completion = response.data //.data.choices;
      return {
        completion: {
          content: response.data,
          role: 'system'
        }, // [0].message?.content!,
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
    throw error
  }
};