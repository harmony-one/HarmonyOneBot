import { InlineKeyboard } from "grammy";
import { pino } from "pino";

import { BotContext, BotConversation } from "../types";
import { isDomainAvailable, validateDomainName } from "../1country/utils/domain";
import config from "../../config";
import { appText } from "../open-ai/utils/text";

const logger = pino({
  name: "OneCountryBot-conversation",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
  },
});

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
    let domainAvailable = false;
    while (true) {
      if (!helpCommand) {
        const validate = validateDomainName(domain);
        if (!validate.valid) {
          ctx.reply(validate.error, {
            parse_mode: "Markdown",
          });
        } else {
          const response = await conversation.external(() => {
            return isDomainAvailable(domain);
            // return checkDomain(domain);
          });
          domainAvailable = response.isAvailable;
          let msg = `The name *${domain}* `;
          if (!domainAvailable && response.isInGracePeriod) {
            msg += `is in grace period ❌. Only the owner is able to renew the domain`;
          } else if (!domainAvailable) {
            msg += `is unavailable ❌.\nKeep writing name options.`;
          } else {
            msg += "is available ✅.\n";
            if (!response.priceUSD.error) {
              msg += `${response.priceOne} ONE = ${response.priceUSD.price} USD for 30 days\n`;
            } else {
              msg += `${response.priceOne} for 30 days\n`;
            }
            msg += `Write *rent* to purchase it, or keep writing new options`;
          }
          ctx.reply(msg, {
            parse_mode: "Markdown",
          });
        }
      }
      const userInput = await conversation.waitFor(":text");
      // {
      //   maxMilliseconds: 60000
      // });
      const userPrompt = cleanInput(userInput.msg.text);
      if (userPrompt.toLocaleLowerCase().includes("rent") && domainAvailable) {
        let keyboard = new InlineKeyboard()
          .webApp(
            "Rent in 1.country",
            `${config.country.hostname}?domain=${domain}`
          )
          .row()
          .webApp(
            "Rent using your local wallet (under construction)",
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
    logger.error("##conversationGountry Error:", e);
  }
}
