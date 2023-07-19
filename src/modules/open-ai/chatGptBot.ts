import { Composer } from "grammy";
import { promptGen } from "./controller";
import { BotContext } from "../types";
import { conversations, createConversation } from "@grammyjs/conversations";
import { conversationGpt } from "./conversations";

export const chatGpt = new Composer<BotContext>();

chatGpt.use(conversations());
chatGpt.use(createConversation(conversationGpt));

chatGpt.command("chat", async (ctx) => {
  const prompt = ctx.match;
  if (!prompt) {
    ctx.reply("Error: Missing prompt");
    return;
  }
  if (ctx.session.openAi.chatGpt.isEnabled) {
    if (ctx.chat.type !== "private") {
      ctx.reply("Generating response...");
      const payload = {
        conversation: [{ role: "user", content: prompt }],
        model: ctx.session.openAi.chatGpt.model,
      };
      const response = await promptGen(payload);
      ctx.reply(response.completion);
    } else {
      ctx.session.openAi.chatGpt.chatConversation = [{ role: "user", content: prompt }]
      await ctx.conversation.enter("conversationGpt");
    }
  } else {
    ctx.reply("Bot disabled");
  }
});
