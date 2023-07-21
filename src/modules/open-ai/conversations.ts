import { promptGen } from "./controller";
import { BotContext, BotConversation, ChatConversation } from "../types";
import { appText } from "./utils/text";

export async function conversationGpt(
  conversation: BotConversation,
  ctx: BotContext
) {
  try {
    await ctx.reply(
      `_Usign model ${conversation.session.openAi.chatGpt.model}_.\n${appText.helpText}\n\n${appText.generatingText}`,
      {
        parse_mode: "Markdown",
      }
    );
    let chat: ChatConversation[] = [
      ...conversation.session.openAi.chatGpt.chatConversation,
    ];
    const initialPrompt = ctx.match as string
    chat.push({ content: initialPrompt, role: 'user' })
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
        ctx.reply(`${appText.helpText}`, {
          parse_mode: "Markdown",
        });
      } else {
        chat.push({
          content: userPrompt,
          role: "user",
        });
        ctx.reply(appText.generatingText); 
      }
    }
    conversation.session.openAi.chatGpt.chatConversation = [...chat];
    return;
  } catch (e) {
    ctx.reply('The bot has encountered an error. Please try again later. ')
    console.log('##conversationGpt Error:', e)
  }
}
