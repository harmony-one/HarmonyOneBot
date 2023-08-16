import config from "../../config";
import {
  OnMessageContext,
  OnCallBackQueryData,
  BotContext,
  BotConversation,
} from "../types";

import {
  getChatModel,
  getChatModelPrice,
  getTokenNumber,
} from "../open-ai/api/openAi";

import { Logger, pino } from "pino";
import { Bot } from "grammy";
import { conversations, createConversation } from "@grammyjs/conversations";
import { conversationGpt } from "./conversationGpt";
import { conversationDomainName } from "./conversationCountry";
import { promptGen } from "../open-ai/controller";
import { getCommandNamePrompt } from "../1country/utils";
import { appText } from "../open-ai/utils/text";
import { BotPayments } from "../payment";

export const SupportedCommands = {
  ask: {
    name: "ask",
    groupParams: ">1",
    privateParams: ">0",
  },
  register: {
    name: "register",
    groupParams: ">1",
    privateParams: ">0",
  },
  end: {
    name: "end",
    groupParams: "=0",
    privateParams: "=0",
  },
};

const payments = new BotPayments();
export class ConversationHandler {
  private logger: Logger;
  private bot: Bot<BotContext>;

  constructor(bot: Bot<BotContext>) {
    this.logger = pino({
      name: "conversation-handler",
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
        },
      },
    });
    this.bot = bot;
    this.bot.use(conversations());
    this.bot.use(createConversation(this.botConversation));
  }

  private async botConversation(
    conversation: BotConversation,
    ctx: BotContext
  ) {
    if (ctx.hasCommand(SupportedCommands.ask.name)) {
      await conversationGpt(conversation, ctx);
    } else if (ctx.hasCommand(SupportedCommands.register.name)) {
      await conversationDomainName(conversation, ctx);
    }
  }

  private hasPrefix(prompt: string): boolean {
    const prefixList = config.openAi.chatGpt.chatPrefix;
    for (let i = 0; i < prefixList.length; i++) {
      if (prompt.startsWith(prefixList[i])) {
        return true;
      }
    }
    return false;
  }

  public isSupportedEvent(
    ctx: OnMessageContext | OnCallBackQueryData
  ): boolean {
    const hasCommand = ctx.hasCommand(
      Object.values(SupportedCommands).map((command) => command.name)
    );
    const hasGroupPrefix = this.hasPrefix(ctx.message?.text || "");
    if (
      ctx.chat?.type !== "private" &&
      hasGroupPrefix &&
      ctx.session.openAi.chatGpt.chatConversation.length > 0
    ) {
      return true;
    }
    if (ctx.chat?.type !== "private") {
      const { commandName } = getCommandNamePrompt(ctx, SupportedCommands);
      if (commandName === SupportedCommands.register.name) {
        return false;
      }
    }
    return hasCommand;
  }

  public isValidCommand(ctx: OnMessageContext | OnCallBackQueryData): boolean {
    const { commandName, prompt } = getCommandNamePrompt(ctx, SupportedCommands);
    const promptNumber = prompt === "" ? 0 : prompt.split(" ").length;
    if (!commandName) {
      const hasGroupPrefix = this.hasPrefix(ctx.message?.text || "");
      if (ctx.chat?.type !== "private" && hasGroupPrefix && promptNumber > 1) {
        return true;
      }
      return false;
    }
    const command = Object.values(SupportedCommands).filter(
      (c) => c.name === commandName
    )[0];
    const comparisonOperator =
      ctx.chat?.type === "private"
        ? command.privateParams[0]
        : command.groupParams[0];
    const comparisonValue = parseInt(
      ctx.chat?.type === "private"
        ? command.privateParams.slice(1)
        : command.groupParams.slice(1)
    );
    switch (comparisonOperator) {
      case ">":
        if (promptNumber >= comparisonValue) {
          return true;
        }
        break;
      case "=":
        if (promptNumber === comparisonValue) {
          return true;
        }
        break;
      default:
        break;
    }
    return false;
  }

  public getEstimatedPrice(ctx: any) {
    return 0;
    // const prompts = ctx.match;
    // if (!prompts) {
    //   return 0;
    // }
    // if (
    //   ctx.chat.type !== "private" &&
    //   ctx.session.openAi.chatGpt.chatConversation.length > 0
    // ) {
    //   return 0;
    // }
    // if (ctx.hasCommand(SupportedCommands.ask.name)) {
    //   const baseTokens = getTokenNumber(prompts as string);
    //   const modelName = ctx.session.openAi.chatGpt.model;
    //   const model = getChatModel(modelName);
    //   const price = getChatModelPrice(model, true, baseTokens); //cents
    //   return ctx.chat.type !== "private" ? price * 2 : price;
    // }
    // return 0
  }

  public async onEvent(ctx: OnMessageContext | OnCallBackQueryData) {
    if (!this.isSupportedEvent(ctx)) {
      this.logger.warn(`### unsupported command ${ctx.message?.text}`);
      return false;
    }

    if (ctx.hasCommand(SupportedCommands.ask.name)) {
      await this.onChat(ctx);
      return;
    }

    if (ctx.hasCommand(SupportedCommands.register.name)) {
      await ctx.conversation.enter("botConversation");
      return;
    }

    if (ctx.hasCommand(SupportedCommands.end.name)) {
      await this.onEnd(ctx);
      return;
    }

    if (this.hasPrefix(ctx.message?.text || "")) {
      await this.onChat(ctx);
      return;
    }
    this.logger.warn(`### unsupported command`);
    ctx.reply("### unsupported command");
  }

  async onChat(ctx: OnMessageContext | OnCallBackQueryData) {
    const { prompt } = getCommandNamePrompt(ctx, SupportedCommands) // ctx.match;
    if (ctx.session.openAi.chatGpt.isEnabled) {
      if (ctx.chat?.type !== "private") {
        const chat = ctx.session.openAi.chatGpt.chatConversation;
        chat.push({ role: "user", content: this.hasPrefix(prompt) ? prompt.slice(1) : prompt });
        const msgId = (
          await ctx.reply(
            `Generating...\n`, // *End Conversation with /end*
            {
              parse_mode: "Markdown",
            }
          )
        ).message_id;
        const payload = {
          conversation: chat,
          model: ctx.session.openAi.chatGpt.model,
        };
        // const response = await promptGen(payload);
        // chat.push({ content: response.completion, role: "system" });
        // ctx.api.editMessageText(ctx.chat?.id!, msgId, response.completion);
        // ctx.session.openAi.chatGpt.chatConversation = [...chat];
        // ctx.session.openAi.chatGpt.usage += response.usage;
        // ctx.session.openAi.chatGpt.price += response.price;
        // const isPay = await payments.pay(
        //   ctx as OnMessageContext,
        //   ctx.session.openAi.chatGpt.price
        // );
        // if (!isPay) {
        //   ctx.reply(appText.gptChatPaymentIssue, {
        //     parse_mode: "Markdown",
        //   });
        // }
      } else {
        await ctx.conversation.enter("botConversation");
      }
    } else {
      ctx.reply("Bot disabled");
    }
  }

  async onEnd(ctx: OnMessageContext | OnCallBackQueryData) {
    ctx.session.openAi.chatGpt.chatConversation = [];
    const usage = ctx.session.openAi.chatGpt.usage;
    const totalPrice = ctx.session.openAi.chatGpt.price;
    ctx.reply(`${appText.gptChatEnd} ${usage} (${totalPrice.toFixed(2)}¢)`);
  }
}
