import axios from "axios";
import { getTokenNumber } from "../api/openAi";
import { ChatConversation } from "../../types";
import { getUSDPrice } from "../../1country/api/coingecko";
import { pino } from "pino";

const logger = pino({
  name: "WebCrawler",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
  },
});
interface WebContent {
  urlText: string;
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
): string {
  let concatenatedText = "";
  let currentTokenCount = 0;
  for (const item of inputArray) {
    if (item.tagName !== "a" && item.tagName !== "code") {
      const text = item.text;
      const tokenCount = getTokenNumber(text);
      if (currentTokenCount + tokenCount <= maxTokens) {
        concatenatedText += text + " ";
        currentTokenCount += tokenCount;
      } else {
        break;
      }
    }
  }
  return concatenatedText;
}

export const getCrawlerPrice = async (
  networkTraffic: number
): Promise<number> => {
  return 0.5; //cents
};

export const getWebContent = async (
  url: string,
  maxTokens: number
): Promise<WebContent> => {
  if (!url.startsWith("https://")) {
    url = `https://${url}`;
  }
  const request = `https://harmony-webcrawler.fly.dev/parse?url=${url}`
  console.log(request)
  try {
    const response = await axios.get(request);
    const result = response.data;
    logger.info(
      `Webcrawling ${url} => Tags processed: ${
        result.elements ? result.elements.length : 0
      }`
    );
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
