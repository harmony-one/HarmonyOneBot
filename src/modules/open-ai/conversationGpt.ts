import { pino } from "pino";

import { promptGen } from "./controller";
import { BotContext, BotConversation, ChatConversation } from "../types";
import { appText } from "./utils/text";

const logger = pino({
  name: "chatGptBot-conversation",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
  },
});

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
    chat.push({ content: initialPrompt, role: "user" });
    let usage = 0;
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
          usage += response.usage;
          ctx.reply(response.completion!);
        }
      }
      const userInput = await conversation.waitFor(":text");
      // {
      //   maxMilliseconds: 300000 // 5min
      // });
      const userPrompt = userInput?.msg?.text;
      if (userPrompt.toLocaleLowerCase().includes("end")) {
        chat = [];
        ctx.reply(`${appText.gptChatEnd} ${usage}`);
        break;
      }
      if (userPrompt.toLocaleLowerCase().includes("help")) {
        ctx.reply(`${appText.gptHelpText}`, {
          parse_mode: "Markdown",
        });
        helpCommand = true;
      } else {
        helpCommand = false;
        chat.push({
          content: userPrompt!,
          role: "user",
        });
        ctx.reply(appText.generatingText);
      }
    }
    conversation.session.openAi.chatGpt.chatConversation = [...chat];
    return;
  } catch (e) {
    ctx.reply("The bot has encountered an error. Please try again later. ");
    logger.error("##conversationGpt Error:", e);
  }
}
