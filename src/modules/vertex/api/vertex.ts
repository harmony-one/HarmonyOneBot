import axios, { AxiosError } from "axios";
import config from "../../../config";
import { ChatConversation } from "../../types";

const API_ENDPOINT = config.vertex.apiEndpoint;
const PROJECT_ID = config.vertex.projectId;

export const vertexCompletion = async (
  conversation: ChatConversation[],
  model = config.vertex.model
) => {
  try {
    const accessToken = await getAccessToken();
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };
    const data = {
      instances: [
        {
          context: "",
          examples: [],
          messages: conversation,
        },
      ],
      parameters: {
        candidateCount: 1,
        maxOutputTokens: 256,
        temperature: 0.2,
        topP: 0.8,
        topK: 40,
      },
    };
    const url = `https://${API_ENDPOINT}/v1/projects/${PROJECT_ID}/locations/us-central1/publishers/google/models/${model}:predict`;

    const response = await axios.post(url, data, { headers });
    if (response) {
      const inputTokenCount =
        response.data.metadata.tokenMetadata.inputTokenCount;
      const totalInputTokens = inputTokenCount.totalTokens;
      const outputTokenCount =
        response.data.metadata.tokenMetadata.outputTokenCount;
      const totalOutputTokens = outputTokenCount.totalTokens;
      const candidates = response.data.predictions[0].candidates;
      return {
        completion: candidates[0].content,
        usage: totalOutputTokens + totalInputTokens,
        price: 0,
      };
    } else {
      return {
        completion: "",
        usage: 0,
        price: 0,
      };
    }
  } catch (error: any) {
    if (error instanceof AxiosError) {
      console.log(error.code);
      console.log(error.message);
      console.log(error.stack);
    }
  }
};

async function getAccessToken() {
  return config.vertex.accessToken;
}
