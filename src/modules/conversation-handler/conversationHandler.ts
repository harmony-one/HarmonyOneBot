import { Composer } from "grammy";
import { promptGen } from "../open-ai/controller";
import { BotContext, BotConversation } from "../types";
import { conversations, createConversation } from "@grammyjs/conversations";
import { conversationGpt } from "../open-ai/conversationGpt";
import { conversationDomainName } from "../1country/conversationCountry";

export const conversationHandler = new Composer<BotContext>();

const botConversation = async (
  conversation: BotConversation,
  ctx: BotContext
) => {
  if (ctx.hasCommand("chat")) {
    await conversationGpt(conversation, ctx);
  } else if (ctx.hasCommand("rent")) {
    await conversationDomainName(conversation, ctx);
  }
};

conversationHandler.use(conversations());
conversationHandler.use(createConversation(botConversation));

conversationHandler.command("chat", async (ctx) => {
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
      await ctx.conversation.enter("botConversation");
    }
  } else {
    ctx.reply("Bot disabled");
  }
});

conversationHandler.command("rent", async (ctx) => {
  const prompt = ctx.match;
  if (!prompt) {
    ctx.reply("Error: Missing domain name");
    return;
  }
  ctx.reply(
    "_Domain names can use a mix of letters and numbers, with no spaces_\nWrite *end* to finish this request",
    {
      parse_mode: "Markdown",
    }
  );
  ctx.reply("Checking name...");
  await ctx.conversation.enter("botConversation");
});
