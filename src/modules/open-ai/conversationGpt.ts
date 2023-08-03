import { pino } from "pino";

import { promptGen } from "./controller";
import {
  BotContext,
  BotConversation,
  ChatConversation,
  OnMessageContext,
} from "../types";
import { appText } from "./utils/text";
import { BotPayments } from "../payment";

const logger = pino({
  name: "chatGptBot-conversation",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
  },
});

const payments = new BotPayments();

export async function conversationGpt(
  conversation: BotConversation,
  ctx: BotContext
) {
  try {
    await ctx.reply(
      `_Usign model ${conversation.session.openAi.chatGpt.model}_.\n${appText.gptHelpText}\n\n${appText.generatingText}`,
      {
        parse_mode: "Markdown",
      }
    );
    let chat: ChatConversation[] = [
      ...conversation.session.openAi.chatGpt.chatConversation,
    ];
    const initialPrompt = ctx.match as string;
    if (initialPrompt) {
      chat.push({ content: initialPrompt, role: "user" });
    }
    let usage = 0;
    let price = 0;
    let helpCommand = false;
    while (true) {
      if (!helpCommand) {
        const response = await conversation.external(() => {
          const payload = {
            conversation: chat,
            model: conversation.session.openAi.chatGpt.model,
          };
          return promptGen(payload);
        });
        if (response) {
          chat.push({ content: response.completion, role: "system" });
          usage = response.usage;
          price = response.price;
          console.log(usage, price);
          await ctx.reply(response.completion!);
          conversation.session.openAi.chatGpt.chatConversation = [...chat];
          console.log(response.completion, usage, price);
          const isPay = await conversation.external(() => {
            return payments.pay(ctx as OnMessageContext, price);
          });
          console.log("here", isPay);
          if (!isPay) {
            ctx.reply(
              `Once the withdrawal instructions are completed, you can return to the current conversation by writing /chat with your prompt.`
            );
            break;
          }
          console.log("after break");
        }
      }
      const userInput = await conversation.waitFor(":text");
      // {
      //   maxMilliseconds: 300000 // 5min
      // });
      const userPrompt = userInput?.msg?.text;
      if (userPrompt.toLocaleLowerCase().includes("end")) {
        conversation.session.openAi.chatGpt.chatConversation = [];
        await ctx.reply(
          `${appText.gptChatEnd} ${usage} (${price.toFixed(2)}¢)`
        );
        break;
      }
      if (userPrompt.toLocaleLowerCase().includes("help")) {
        await ctx.reply(`${appText.gptHelpText}`, {
          parse_mode: "Markdown",
        });
        helpCommand = true;
      } else {
        helpCommand = false;
        chat.push({
          content: userPrompt!,
          role: "user",
        });
        await ctx.reply(appText.generatingText);
      }
    }
    console.log("outside");
    return;
  } catch (e) {
    ctx.reply("The bot has encountered an error. Please try again later. ");
    logger.error("##conversationGpt Error:", e);
  }
}
