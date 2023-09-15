import axios from "axios";
import * as cheerio from "cheerio";
import { getTokenNumber } from "../api/openAi";
import { ChatConversation } from "../../types";
import { getUSDPrice } from "../../1country/api/coingecko";
import { pino } from "pino";
import { Kagi } from "../../voice-memo/kagi";
import config from "../../../config";

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
  urlText: string[];
  elapsedTime: number;
  networkTraffic: number;
  fees: number;
  oneFees: number;
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
): string[] {
  let parsedArray = inputArray.filter(t => t.tagName !== 'a' && t.tagName !== 'code').map(t => t.text) 
  return parsedArray;
}

export const getCrawlerPrice = async (
  networkTraffic: number
): Promise<number> => {
  return 0.5; //cents
};

export const getWebContentKagi = async (
  url: string,
  maxTokens: number
) => {
  if (!url.startsWith("https://")) {
    url = `https://${url}`;
  }
  const kagi = new Kagi(config.voiceMemo.kagiApiKey);
  const request = `https://harmony-webcrawler.fly.dev/parse?url=${url}`;
  logger.info(request);
  try {
    const response = await kagi.getSummarization(request);
    return {
      urlText: response,
      elapsedTime: 0, // result.elapsedTime,
      networkTraffic: 0, // result.networkTraffic,
      fees: 0.5, //await getCrawlerPrice(result.networkTraffic),
      oneFees: 0.5,
    };
  } catch (e) {
    throw e;
  }
};

export const getWebContent = async (
  url: string,
  maxTokens: number,
  username?: string,
  password?: string
): Promise<WebContent> => {
  if (!url.startsWith("https://")) {
    url = `https://${url}`;
  }
  const credentials =
    username && password ? `&username=${username}&password=${password}` : "";
  const request = `https://harmony-webcrawler.fly.dev/parse?url=${url}${credentials}`;
  logger.info(request);
  try {
    const response = await axios.get(request);
    const result = response.data;
    logger.info(
      `Webcrawling ${url} => Tags processed: ${
        result.elements ? result.elements.length : 0
      }`
    );
    const text = parseWebContent(result.elements);
    return {
      urlText: text,
      elapsedTime: result.elapsedTime,
      networkTraffic: result.networkTraffic,
      fees: await getCrawlerPrice(result.networkTraffic),
      oneFees: 0.5,
    };
  } catch (e) {
    throw e;
  }
};

interface TelegramUserProfile {
  username: string;
  displayName: string;
  bio: string;
}

export const getChatMemberInfo = async (
  username: string
): Promise<TelegramUserProfile> => {
  const url = `https://t.me/${username}`;
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    // Extract the display name
    const displayName = $("div.tgme_page_title").text().trim();

    // Extract the bio
    const bio = $("div.tgme_page_description").text().trim();

    const userInfo = {
      username,
      displayName,
      bio,
    };

    return userInfo;
  } catch (e) {
    throw e;
  }
};

