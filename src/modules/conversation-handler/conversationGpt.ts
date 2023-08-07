import { pino } from "pino";

import { promptGen } from "../open-ai/controller";
import {
  BotContext,
  BotConversation,
  ChatConversation,
  OnMessageContext,
} from "../types";
import { appText } from "../open-ai/utils/text";
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
      `_Usign model ${conversation.session.openAi.chatGpt.model}_.\n${appText.gptHelpText}\n`,
      {
        parse_mode: "Markdown",
      }
    );
    let chat: ChatConversation[] = [];
    const initialPrompt = ctx.match as string;
    if (initialPrompt) {
      chat.push({ content: initialPrompt, role: "user" });
    } else {
      chat = [...conversation.session.openAi.chatGpt.chatConversation]
    }
    let usage = 0;
    let price = 0;
    let totalPrice = 0
    let helpCommand = false;
    let msgId = 0;
    msgId = (await ctx.reply(appText.generatingText,{
      parse_mode: "Markdown",
    })).message_id;
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
          usage += response.usage;
          price = response.price;
          totalPrice += price
          ctx.api.editMessageText(ctx.chat?.id!, msgId, response.completion!, {
            parse_mode: "Markdown",
          });
          
          // await ctx.reply();
          conversation.session.openAi.chatGpt.chatConversation = [...chat];
          const isPay = await conversation.external(() => {
            return payments.pay(ctx as OnMessageContext, price);
          });
          if (!isPay) {
            ctx.reply(appText.gptChatPaymentIssue, {
              parse_mode: "Markdown",
            })
            break;
          }
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
          `${appText.gptChatEnd} ${usage} (${totalPrice.toFixed(2)}¢)`
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
        msgId = (await ctx.reply(appText.generatingText,{
          parse_mode: "Markdown",
        })).message_id;
      }
    }
    return;
  } catch (e) {
    ctx.reply("The bot has encountered an error. Please try again later. ");
    logger.error("##conversationGpt Error:", e);
  }
}
