import { BotContext, BotConversation } from "../types";
// import { appText } from "./utils/text";
import { getUrl } from "./utils";
import { relayApi } from "./api/relayApi";
import { InlineKeyboard } from "grammy";
import config from "../../config";

const checkDomain = async (domain: string) => {
  const url = getUrl(domain, false);
  const response = await relayApi().checkDomain({ sld: url });
  console.log(response);
  return response;
};

const cleanInput = (input: string) => {
  return input.replace(/[^a-z0-9-]/g, '').toLowerCase();
}
export async function conversationDomainName(
  conversation: BotConversation,
  ctx: BotContext
) {
  try {
    let domain = cleanInput(ctx.match as string);
    while (true) {
      const response = await checkDomain(domain);
      ctx.reply(`The name *${domain}* is ${response.isAvailable ? 'available. Write *rent* to purchase it, or keep writing new options' : 'unavailable. Keep writing options.'}`, {
        parse_mode: "Markdown",
      });
      const userInput = await conversation.waitFor(":text");
      const userPrompt = cleanInput(userInput.msg.text);
      if (userPrompt === "rent" || userPrompt === "/rent") {
        let keyboard = new InlineKeyboard()
          .webApp("Rent in 1.country", `${config.country.hostname}?domain=${domain}`)
          .row()
          .webApp("Rent using your local wallet", `${config.country.hostname}?domain=${domain}`);
        ctx.reply(`Rent ${userPrompt}`, {
          reply_markup: keyboard,
        });
        break;
      }
      if (userPrompt === "help" || userPrompt === "/help") {
        ctx.reply(`${"ayudame"}`, {
          parse_mode: "Markdown",
        });
      }
      domain = userPrompt;
    }
    console.log('here')
    // conversation.session.openAi.chatGpt.chatConversation = [...chat];
    return;
  } catch (e) {
    ctx.reply("The bot has encountered an error. Please try again later. ");
    console.log("##conversationGpt Error:", e);
  }
}
