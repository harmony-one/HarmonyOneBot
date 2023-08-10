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

const SupportedCommands = {
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
};
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

  public isSupportedEvent(
    ctx: OnMessageContext | OnCallBackQueryData
  ): boolean {
    const hasCommand = ctx.hasCommand(
      Object.values(SupportedCommands).map((command) => command.name)
    );
    if (ctx.chat?.type !== 'private') {
      const { commandName } = getCommandNamePrompt(ctx);
      if (commandName === SupportedCommands.register.name) {
        return false
      }
    }
    return hasCommand;
  }

  public isValidCommand(ctx: OnMessageContext | OnCallBackQueryData): boolean {
    const { commandName, prompt } = getCommandNamePrompt(ctx);
    const command = Object.values(SupportedCommands).filter(
      (c) => c.name === commandName
    )[0];
    const promptNumber = prompt === "" ? 0 : prompt.split(" ").length;
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
    // 0;
    // if (ctx.hasCommand(SupportedCommands.ask.name)) {
    //   const baseTokens = getTokenNumber(prompts as string);
    //   const modelName = ctx.session.openAi.chatGpt.model;
    //   const model = getChatModel(modelName);
    //   const price = getChatModelPrice(model, true, baseTokens); //cents
    //   return ctx.chat.type !== "private" ? price * 2 : price;
    // }
    // return 0;
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

    this.logger.warn(`### unsupported command`);
    ctx.reply("### unsupported command");
  }

  async onChat(ctx: OnMessageContext | OnCallBackQueryData) {
    const prompt = ctx.match;
    if (ctx.session.openAi.chatGpt.isEnabled) {
      if (ctx.chat?.type !== "private") {
        const msgId = (
          await ctx.reply(
            `Generating response using model ${ctx.session.openAi.chatGpt.model}...`
          )
        ).message_id;
        const payload = {
          conversation: [{ role: "user", content: prompt as string }],
          model: ctx.session.openAi.chatGpt.model,
        };
        const response = await promptGen(payload);
        ctx.api.editMessageText(ctx.chat?.id!, msgId, response.completion);
      } else {
        await ctx.conversation.enter("botConversation");
      }
    } else {
      ctx.reply("Bot disabled");
    }
  }
}
