import { Composer } from "grammy";
import config from "../../config";
import { BotContext } from "../types";
import { relayApi } from "./api/relayApi";

export const oneCountry = new Composer<BotContext>();

oneCountry.command("cert", async (ctx) => {
  let url = ctx.match;
  try {
    if (url.endsWith("/")) {
      url = url.slice(0, url.length - 1);
    }
    if (url.startsWith("https://")) {
      url = url.slice("https://".length);
    }
    url = !url.includes(".country") ? url.concat(config.country.tld) : url;

    const response = await relayApi().createCert({ domain: url });
    if (!response.error) {
      ctx.reply(`The SSL certificate of ${url} was renewed`);
    } else {
      ctx.reply(`${response.error}`);
    }
  } catch (e) {
    console.log(e);
    ctx.reply("There was an error processing your request");
  }
});

oneCountry.command("nft", async (ctx) => {
  let url = ctx.match;
  try {
    if (url.endsWith("/")) {
      url = url.slice(0, url.length - 1);
    }
    if (url.startsWith("https://")) {
      url = url.slice("https://".length);
    }
    url = !url.includes(".country") ? url.concat(config.country.tld) : url;

    const response = await relayApi().genNFT({ domain: url });
    console.log(response);
    ctx.reply("NFT metadata generated");
  } catch (e) {
    console.log(e);
    ctx.reply("There was an error processing your request");
  }
});

oneCountry.command("check", async (ctx) => {
  console.log("gen check");
  let url = ctx.match;
  if (!url) {
    ctx.reply("Error: Missing 1.country domain");
    return;
  }

  if (url.endsWith("/")) {
    url = url.slice(0, url.length - 1);
  }
  if (url.startsWith("https://")) {
    url = url.slice("https://".length);
  }
  url = url.includes(".country") ? url.split(".")[0] : url;

  const response = await relayApi().checkDomain({ sld: url });
  if (!response.error) {
    let msg = `The domain ${url}${config.country.tld} is ${
      !response.isAvailable ? "not" : ""
    } available`;
    ctx.reply(msg);
  } else {
    ctx.reply(`${response.error}`);
  }
});

oneCountry.command("check", async (ctx) => {
  console.log("gen check");
  let url = ctx.match;
  if (!url) {
    ctx.reply("Error: Missing 1.country domain");
    return;
  }

  if (url.endsWith("/")) {
    url = url.slice(0, url.length - 1);
  }
  if (url.startsWith("https://")) {
    url = url.slice("https://".length);
  }
  url = url.includes(".country") ? url.split(".")[0] : url;

  const response = await relayApi().checkDomain({ sld: url });
  if (!response.error) {
    let msg = `The domain ${url}${config.country.tld} is ${
      !response.isAvailable ? "not" : ""
    } available`;
    ctx.reply(msg);
  } else {
    ctx.reply(`${response.error}`);
  }
});
