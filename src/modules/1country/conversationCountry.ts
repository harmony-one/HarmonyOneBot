import { BotContext, BotConversation } from "../types";
import { getUrl } from "./utils";
import { relayApi } from "./api/relayApi";
import { InlineKeyboard } from "grammy";
import config from "../../config";
import { appText } from "../open-ai/utils/text";

const checkDomain = async (domain: string) => {
  const url = getUrl(domain, false);
  const response = await relayApi().checkDomain({ sld: url });
  console.log(response);
  return response;
};

const cleanInput = (input: string) => {
  return input.replace(/[^a-z0-9-]/g, "").toLowerCase();
};
export async function conversationDomainName(
  conversation: BotConversation,
  ctx: BotContext
) {
  try {
    let domain = cleanInput(ctx.match as string);
    let helpCommand = false;
    let isAvailable = false;
    while (true) {
      if (!helpCommand) {
        const response = await conversation.external(() => {
          return checkDomain(domain);
        });
        isAvailable = response.isAvailable;
        ctx.reply(
          `The name *${domain}* is ${
            isAvailable
              ? "available ✅.\nWrite *rent* to purchase it, or keep writing new options"
              : "unavailable ❌. Keep writing name options."
          }`,
          {
            parse_mode: "Markdown",
          }
        );
      }
      const userInput = await conversation.waitFor(":text");
      // {
      //   maxMilliseconds: 60000
      // });
      const userPrompt = cleanInput(userInput.msg.text);
      if (userPrompt.toLocaleLowerCase().includes("rent") && isAvailable) {
        let keyboard = new InlineKeyboard()
          .webApp(
            "Rent in 1.country",
            `${config.country.hostname}?domain=${domain}`
          )
          .row()
          .webApp(
            "Rent using your local wallet",
            `${config.country.hostname}?domain=${domain}`
          );
        ctx.reply(`Rent ${userPrompt}`, {
          reply_markup: keyboard,
        });
        break;
      } else if (userPrompt.toLocaleLowerCase().includes("rent")) {
        ctx.reply("Keep writing options", {
          parse_mode: "Markdown",
        });
        helpCommand = true;
      } else if (userPrompt.toLocaleLowerCase().includes("end")) {
        ctx.reply(appText.endChat, {
          parse_mode: "Markdown",
        });
        break;
      } else if (userPrompt.toLocaleLowerCase().includes("help")) {
        helpCommand = true;
        ctx.reply(`${appText.gptHelpText}`, {
          parse_mode: "Markdown",
        });
      } else {
        helpCommand = false;
        domain = userPrompt;
        ctx.reply("Checking name...");
      }
    }
    return;
  } catch (e) {
    ctx.reply("The bot has encountered an error. Please try again later. ");
    console.log("##conversationGpt Error:", e);
  }
}
