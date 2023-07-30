import { InlineKeyboard } from "grammy";
import { pino } from "pino";

import { BotContext, BotConversation } from "../types";
import { isDomainAvailable, validateDomainName } from "./utils/domain";
import config from "../../config";
import { appText } from "../open-ai/utils/text";
import { TimedOutError } from "telegram/errors";

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
            msg += `is unavailable ❌. Keep writing name options.`;
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
      // const userInput = await conversation
      //   .waitFor(":text", {
      //     drop: true,
      //     maxMilliseconds: 60000,
      //     // otherwise: (ctx) => {
      //     //   console.log('here me HERE')
      //     //   ctx.reply('NOOOOO')
      //     //   return 'end'
      //     // }
      //   }) 
      //   .then(
      //     (value) => {
      //       return value.msg.text;
      //     },
      //     (reason) => {
      //       console.log("REASON", reason);
      //       return "end";
      //     }
      //   );
      
      const userInput = await conversation
        .waitFor(":text", {
          maxMilliseconds: 60000,
        }) 
        .then(
          (value) => {
            return value.msg.text;
          },
          (reason) => {
            console.log("REASON", reason);
            return "end"; // end will break the while loop
          }
        );
      const userPrompt = userInput //.msg.text; //. .msg ? cleanInput(userInput.msg.text!) : 'end'
      console.log(userInput);
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
        ctx.reply(`Rent ${domain}`, {
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

export async function conversationDomainNameMAIN(
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
            msg += `is unavailable ❌. Keep writing name options.`;
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
      // const userInput1 = await conversation.waitFor(":text");

      let timeout: string | number | NodeJS.Timeout | undefined;
      const userInput: any = await Promise.race([
        conversation.waitFor(":text").then((msg) => {
          clearTimeout(timeout);
          return { msg, timeout: false };
        }),
        new Promise(
          (resolve) =>
            (timeout = setTimeout(() => resolve({ timeout: true }), 10000))
        ),
      ]);
      let userPrompt: string;
      if (userInput.timeout) {
        ctx.reply("Sorry, your session has timed out. Please start a new one.");
        userPrompt = "end";
        // break;
        // console.log('HOLA JOE')
      } else {
        userPrompt = cleanInput(userInput.msg.msg.text);
      }
      console.log("userInput", userInput);

      // {
      //   maxMilliseconds: 60000
      // });
      // const userPrompt = cleanInput(userInput.msg.msg.text);
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
        ctx.reply(`Rent ${domain}`, {
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
    console.log("me sali");
    return;
  } catch (e) {
    ctx.reply("The bot has encountered an error. Please try again later. ");
    logger.error("##conversationGountry Error:", e);
  }
}

export async function conversationDomainNameJAJAAJ(
  conversation: BotConversation,
  ctx: BotContext
) {
  try {
    let domain = cleanInput(ctx.match as string);
    let helpCommand = false;
    let domainAvailable = false;
    let timeoutOccurred = false;
    let timeout: NodeJS.Timeout | undefined;

    const handleTimeout = () => {
      ctx.reply("Sorry, your session has timed out. Please start a new one.");
      conversation.skip(); // . .sleep .stopWaiting();
    };

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
            msg += `is unavailable ❌. Keep writing name options.`;
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

      // Set the conversation timeout to 3 minutes (180000 milliseconds)
      const timeoutMilliseconds = 10000; //180000;
      // let timeout: string | number | NodeJS.Timeout | undefined;

      const userInputPromise = conversation.waitFor(":text").then((msg) => {
        if (timeout) {
          clearTimeout(timeout);
        }
        return msg;
      });

      const timeoutPromise = new Promise<void>((resolve) => {
        timeout = setTimeout(() => {
          timeoutOccurred = true;
          resolve();
        }, timeoutMilliseconds);
      });

      const userInput = await Promise.race([userInputPromise, timeoutPromise]);

      if (timeoutOccurred) {
        ctx.reply("Sorry, your session has timed out. Please start a new one.");
        timeoutOccurred = false;
        break;
      }

      let userPrompt: string;
      if (userInput) {
        console.log("userInput", userInput);
        userPrompt = cleanInput(userInput.msg.text);
      } else {
        ctx.reply("Sorry, your session has timed out. Please start a new one.");
        timeoutOccurred = false;
        userPrompt = "end";
      }

      // {
      //   maxMilliseconds: 60000
      // });
      // const userPrompt = cleanInput(userInput.msg.msg.text);
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
        ctx.reply(`Rent ${domain}`, {
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
