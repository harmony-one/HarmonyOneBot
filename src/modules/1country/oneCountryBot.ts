import { Composer, InlineKeyboard } from "grammy";
import pino from "pino";

import config from "../../config";
import { BotContext } from "../types";
import { relayApi } from "./api/relayApi";
import { AxiosError } from "axios";
import { getUrl } from "./utils/";

const logger = pino({
  name: "OneCountryBot",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
  },
});

export const oneCountry = new Composer<BotContext>();

oneCountry.command("visit", async (ctx) => {
  if (!ctx.match) {
    ctx.reply("Error: Missing 1.country domain");
    return;
  }
  const url = getUrl(ctx.match);
  let keyboard = new InlineKeyboard().webApp("Go", `https://${url}/`);

  ctx.reply(`Visit ${url}`, {
    reply_markup: keyboard,
  });
});

oneCountry.command("renew", async (ctx) => {
  if (!ctx.match) {
    ctx.reply("Error: Missing 1.country domain");
    return;
  }
  const url = getUrl(ctx.match);
  let keyboard = new InlineKeyboard()
    .webApp("Renew in 1.country", `https://${url}/?renew`)
    .row()
    .webApp(
      "Rent using your local wallet (under construction)",
      `https://${url}/?renew`
    );

  ctx.reply(`Renew ${url}`, {
    reply_markup: keyboard,
  });
});

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
    logger.error(
      e instanceof AxiosError
        ? e.response?.data.error
        : "There was an error processing your request"
    );
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
    ctx.reply("NFT metadata generated");
  } catch (e) {
    logger.error(
      e instanceof AxiosError
        ? e.response?.data.error
        : "There was an error processing your request"
    );
    ctx.reply(
      e instanceof AxiosError
        ? e.response?.data.error
        : "There was an error processing your request"
    );
  }
});

oneCountry.command("check", async (ctx) => {
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
    logger.error(
      e instanceof AxiosError
        ? e.response?.data.error
        : "There was an error processing your request"
    );
    ctx.reply(
      e instanceof AxiosError
        ? e.response?.data.error
        : "There was an error processing your request"
    );
  }
});
