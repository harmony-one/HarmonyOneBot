import { promptGen } from "./controller";
import { BotContext, BotConversation, ChatConversation } from "../types";

const introText = `Send a message to ChatGPT 4`;
const helpText = `Write *end* to finish this conversation.\nWrite *help* to get help.`;

export async function conversationGpt(
  conversation: BotConversation,
  ctx: BotContext
) {
  await ctx.reply(
    `${introText}\n_Usign model ${conversation.session.openAi.chatGpt.model}_.\n${helpText}`,
    {
      parse_mode: "Markdown",
    }
  );
  let chat: ChatConversation[] = [
    ...conversation.session.openAi.chatGpt.chatConversation,
  ];
  while (true) {
    const userInput = await conversation.waitFor(":text");
    const userPrompt = userInput.msg.text;
    if (userPrompt === "end" || userPrompt === "/end") {
      ctx.reply("Bye");
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
      ctx.reply("Generating response...");
      const response = await conversation.external(() => {
        const payload = {
          conversation: chat,
          model: conversation.session.openAi.chatGpt.model,
        };
        return promptGen(payload);
      });
      if (response) {
        chat.push({ content: response, role: "system" });
        ctx.reply(response);
      }
    }
  }
  conversation.session.openAi.chatGpt.chatConversation = [...chat];
  return;
}
