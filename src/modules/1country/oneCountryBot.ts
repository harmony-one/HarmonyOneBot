import { Composer } from "grammy";
import config from "../../config";
import { BotContext } from "../types";
import { relayApi } from "./api/relayApi";
import { AxiosError } from "axios";

export const oneCountry = new Composer<BotContext>();

const getUrl = (url: string, fullUrl = true) => {
  if (url.endsWith("/")) {
    url = url.slice(0, url.length - 1);
  }
  if (url.startsWith("https://")) {
    url = url.slice("https://".length);
  }
  return !url.includes(".country") && fullUrl
    ? url.concat(config.country.tld)
    : url;
};

oneCountry.command("cert", async (ctx) => {
  if (!ctx.match) {
    ctx.reply("Error: Missing 1.country domain");
    return;
  }
  const url = getUrl(ctx.match);
  try {
    const response = await relayApi().createCert({ domain: url });
    if (!response.error) {
      ctx.reply(`The SSL certificate of ${url} was renewed`);
    } else {
      ctx.reply(`${response.error}`);
    }
  } catch (e) {
    ctx.reply(
      e instanceof AxiosError
        ? e.response?.data.error
        : "There was an error processing your request"
    );
  }
});

oneCountry.command("nft", async (ctx) => {
  if (!ctx.match) {
    ctx.reply("Error: Missing 1.country domain");
    return;
  }
  const url = getUrl(ctx.match);
  try {
    const response = await relayApi().genNFT({ domain: url });
    console.log(response);
    ctx.reply("NFT metadata generated");
  } catch (e) {
    console.log(e);
    ctx.reply(
      e instanceof AxiosError
        ? e.response?.data.error
        : "There was an error processing your request"
    );
  }
});

oneCountry.command("check", async (ctx) => {
  console.log("gen check");
  if (!ctx.match) {
    ctx.reply("Error: Missing 1.country domain");
    return;
  }
  try {
    const url = getUrl(ctx.match, false);
    const response = await relayApi().checkDomain({ sld: url });
    if (!response.error) {
      let msg = `The domain ${url}${config.country.tld} is ${
        !response.isAvailable ? "not available" : "available"
      }`;
      ctx.reply(msg);
    } else {
      ctx.reply(`${response.error}`);
    }
  } catch (e) {
    ctx.reply(
      e instanceof AxiosError
        ? e.response?.data.error
        : "There was an error processing your request"
    );
  }
});
