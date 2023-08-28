import axios from "axios";
import { getTokenNumber } from "../api/openAi";
import { ChatConversation } from "../../types";

interface WebContent {
  urlText: ChatConversation[];
  elapsedTime: number;
  networkTraffic: number;
}

interface CrawlerElement {
  text: string;
  tagName: string;
}

const urlRegex =
  /^(https?:\/\/)?([\w.-]+\.[a-zA-Z]{2,}|[\w.-]+\.[a-zA-Z]{1,3}\.[a-zA-Z]{1,3})(\/\S*)?$/;

export const isValidUrl = (url: string): boolean => {
  return urlRegex.test(url);
};

function parseWebContent(
  inputArray: CrawlerElement[],
  maxTokens: number
) {
  let concatenatedText = "";
  const resultArray = [];
  let currentTokenCount = 0;
  for (const item of inputArray) {
    if (item.tagName !== "a" && item.tagName !== "code") {
      const text = item.text;
      const tokenCount = getTokenNumber(text);
      if (currentTokenCount + tokenCount <= maxTokens) {
        concatenatedText += text + " ";
        currentTokenCount += tokenCount;
      } else {
        resultArray.push({
          content: concatenatedText.trim(),
          role: "user",
        });
        break;
      }
    }
  }
  return resultArray;
}

export const getWebContent = async (url: string, maxTokens: number): Promise<WebContent> => {
  if (!url.startsWith("https://")) {
    url = `https://${url}`;
  }
  console.log(url, maxTokens);
  try {
    const response = await axios.get(
      `https://harmony-webcrawler.fly.dev/parse?url=${url}`
    );
    const result = response.data;
    const text = parseWebContent(result.elements, maxTokens);
    return {
      urlText: text,
      elapsedTime: result.elapsedTime,
      networkTraffic: result.networkTraffic,
    };
    // return { price: formatUSDAmount(Number(onePrice) * usdPrice), error: null };
  } catch (e) {
    throw e;
  }
};
