import { promptGen } from "./controller";
import { BotContext, BotConversation, ChatConversation } from "../types";

const generatingText = `Generating response...`;
const helpText = `Write *end* to finish this conversation.\nWrite *help* to repeat this message.`;

export async function conversationGpt(
  conversation: BotConversation,
  ctx: BotContext
) {
  await ctx.reply(
    `_Usign model ${conversation.session.openAi.chatGpt.model}_.\n${helpText}\n\n${generatingText}`,
    {
      parse_mode: "Markdown",
    }
  );
  let chat: ChatConversation[] = [
    ...conversation.session.openAi.chatGpt.chatConversation,
  ];
  let usage = 0
  while (true) {
    const response = await conversation.external(() => {
      const payload = {
        conversation: chat,
        model: conversation.session.openAi.chatGpt.model,
      };
      return promptGen(payload);
    });
    if (response) {
      chat.push({ content: response.completion, role: "system" });
      usage += response.usage
      ctx.reply(response.completion!);
    }
    const userInput = await conversation.waitFor(":text");
    const userPrompt = userInput.msg.text;
    if (userPrompt === "end" || userPrompt === "/end") {
      ctx.reply(`Chat finished. Total tokens used: ${usage}`);
      chat = [];
      break;
    }
    if (userPrompt === "help" || userPrompt === "/help") {
      ctx.reply(`${helpText}`, {
        parse_mode: "Markdown",
      });
    } else {
      chat.push({
        content: userPrompt,
        role: "user",
      });
      ctx.reply(generatingText); 
    }
  }
  conversation.session.openAi.chatGpt.chatConversation = [...chat];
  return;
}
