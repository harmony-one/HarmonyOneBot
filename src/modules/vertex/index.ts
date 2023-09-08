import { GrammyError } from "grammy";
import { Logger, pino } from "pino";

import { getCommandNamePrompt } from "../1country/utils";
import { BotPayments } from "../payment";
import {
  OnMessageContext,
  OnCallBackQueryData,
  ChatConversation,
  ChatPayload,
} from "../types";
import { appText } from "../open-ai/utils/text";
import { chatService } from "../../database/services";
import config from "../../config";
import { sleep } from "../sd-images/utils";
import {
  getPromptPrice,
  hasPrefix,
  isMentioned,
  limitPrompt,
  MAX_TRIES,
  preparePrompt,
  sendMessage,
  SupportedCommands,
} from "./helpers";
import { vertexCompletion } from "./api/vertex";

export class VertexPalmBot {
  private logger: Logger;
  private payments: BotPayments;
  private botSuspended: boolean;

  constructor(payments: BotPayments) {
    this.logger = pino({
      name: "VertexPalmBot",
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
        },
      },
    });
    this.botSuspended = false;
    this.payments = payments;
  }

  public async isSupportedEvent(
    ctx: OnMessageContext | OnCallBackQueryData
  ): Promise<boolean> {
    const hasCommand = ctx.hasCommand(
      Object.values(SupportedCommands).map((command) => command.name)
    );
    if (isMentioned(ctx)) {
      return true;
    }
    const chatPrefix = hasPrefix(ctx.message?.text || "");
    if (chatPrefix !== "") {
      return true;
    }
    return hasCommand;
  }

  public getEstimatedPrice(ctx: any): number {
    return 0;
  }

  public async onEvent(ctx: OnMessageContext | OnCallBackQueryData) {
    if (!this.isSupportedEvent(ctx) && ctx.chat?.type !== "private") {
      this.logger.warn(`### unsupported command ${ctx.message?.text}`);
      return false;
    }

    if (ctx.hasCommand(SupportedCommands.palm.name)) {
      this.onChat(ctx);
      return;
    }

    if (ctx.hasCommand(SupportedCommands.bard.name)) {
      this.onChat(ctx);
      return;
    }

    this.logger.warn(`### unsupported command`);
    sendMessage(ctx, "### unsupported command").catch((e) =>
      this.onError(ctx, e, MAX_TRIES, "### unsupported command")
    );
  }

  private async hasBalance(ctx: OnMessageContext | OnCallBackQueryData) {
    const accountId = this.payments.getAccountId(ctx as OnMessageContext);
    const addressBalance = await this.payments.getUserBalance(accountId);
    const creditsBalance = await chatService.getBalance(accountId);
    const balance = addressBalance.plus(creditsBalance);
    const balanceOne = (await this.payments.toONE(balance, false)).toFixed(2);
    return (
      +balanceOne > +config.vertex.minimumBalance ||
      (await this.payments.isUserInWhitelist(ctx.from.id, ctx.from.username))
    );
  }

  private async promptGen(data: ChatPayload) {
    const { conversation, ctx, model } = data;
    try {
      let msgId = (
        await ctx.reply("...", {
          message_thread_id: ctx.message?.message_thread_id,
        })
      ).message_id;
      ctx.chatAction = "typing";

      const completion = await vertexCompletion(conversation, "chat-bison@001");
      console.log("HELLOOO", completion);
      if (completion) {
        ctx.api.editMessageText(ctx.chat?.id!, msgId, completion.completion);
        conversation.push({
          content: completion.completion,
          author: "bot",
        });
        // const price = getPromptPrice(completion, data);
        // this.logger.info(
        //   `streamChatCompletion result = tokens: ${
        //     price.promptTokens + price.completionTokens
        //   } | ${model} | price: ${price}¢`
        // );
        return {
          price: 0,
          chat: conversation,
        };
      }
      ctx.chatAction = null;

      return {
        price: 0,
        chat: conversation,
      };
    } catch (e: any) {
      ctx.chatAction = null;
      throw e;
    }
  }

  async onPrefix(ctx: OnMessageContext | OnCallBackQueryData) {
    try {
      if (this.botSuspended) {
        sendMessage(ctx, "The bot is suspended").catch((e) =>
          this.onError(ctx, e)
        );
        return;
      }
      const { prompt, commandName } = getCommandNamePrompt(
        ctx,
        SupportedCommands
      );
      const prefix = hasPrefix(prompt);
      ctx.session.vertex.requestQueue.push(
        await preparePrompt(ctx, prompt.slice(prefix.length))
      );
      if (!ctx.session.vertex.isProcessingQueue) {
        ctx.session.vertex.isProcessingQueue = true;
        this.onChatRequestHandler(ctx).then(() => {
          ctx.session.vertex.isProcessingQueue = false;
        });
      }
    } catch (e) {
      this.onError(ctx, e);
    }
  }

  async onChat(ctx: OnMessageContext | OnCallBackQueryData) {
    try {
      if (this.botSuspended) {
        sendMessage(ctx, "The bot is suspended").catch((e) =>
          this.onError(ctx, e)
        );
        return;
      }
      const prompt = ctx.match ? ctx.match : ctx.message?.text;
      ctx.session.vertex.requestQueue.push(
        await preparePrompt(ctx, prompt as string)
      );
      if (!ctx.session.vertex.isProcessingQueue) {
        ctx.session.vertex.isProcessingQueue = true;
        this.onChatRequestHandler(ctx).then(() => {
          ctx.session.vertex.isProcessingQueue = false;
        });
      }
    } catch (e: any) {
      this.onError(ctx, e);
    }
  }

  async onChatRequestHandler(ctx: OnMessageContext | OnCallBackQueryData) {
    while (ctx.session.vertex.requestQueue.length > 0) {
      try {
        const prompt = ctx.session.vertex.requestQueue.shift() || "";
        const { chatConversation, model } = ctx.session.vertex;
        if (await this.hasBalance(ctx)) {
          if (prompt === "") {
            const msg =
              chatConversation.length > 0
                ? `${appText.gptLast}\n_${
                    chatConversation[chatConversation.length - 1].content
                  }_`
                : appText.introText;
            await sendMessage(ctx, msg, {
              parseMode: "Markdown",
            }).catch((e) => this.onError(ctx, e));
            return;
          }
          chatConversation.push({
            author: "user",
            content: limitPrompt(prompt),
          });
          const payload = {
            conversation: chatConversation!,
            model: model || config.vertex.model,
            ctx,
          };
          const result = await this.promptGen(payload);
          ctx.session.vertex.chatConversation = [...result.chat];
          if (
            !(await this.payments.pay(ctx as OnMessageContext, result.price))
          ) {
            this.onNotBalanceMessage(ctx);
          }
          ctx.chatAction = null;
        } else {
          this.onNotBalanceMessage(ctx);
        }
      } catch (e: any) {
        this.onError(ctx, e);
      }
    }
  }

  async onEnd(ctx: OnMessageContext | OnCallBackQueryData) {
    ctx.session.vertex.chatConversation = [];
    ctx.session.vertex.usage = 0;
    ctx.session.vertex.price = 0;
  }

  async onNotBalanceMessage(ctx: OnMessageContext | OnCallBackQueryData) {
    const accountId = this.payments.getAccountId(ctx as OnMessageContext);
    const account = await this.payments.getUserAccount(accountId);
    const addressBalance = await this.payments.getUserBalance(accountId);
    const creditsBalance = await chatService.getBalance(accountId);
    const balance = addressBalance.plus(creditsBalance);
    const balanceOne = (await this.payments.toONE(balance, false)).toFixed(2);
    const balanceMessage = appText.notEnoughBalance
      .replaceAll("$CREDITS", balanceOne)
      .replaceAll("$WALLET_ADDRESS", account?.address || "");
    await sendMessage(ctx, balanceMessage, {
      parseMode: "Markdown",
    }).catch((e) => this.onError(ctx, e));
  }

  async onError(
    ctx: OnMessageContext | OnCallBackQueryData,
    e: any,
    retryCount: number = MAX_TRIES,
    msg?: string
  ) {
    if (retryCount === 0) {
      // Retry limit reached, log an error or take alternative action
      this.logger.error(`Retry limit reached for error: ${e}`);
      return;
    }
    if (e instanceof GrammyError) {
      if (e.error_code === 400 && e.description.includes("not enough rights")) {
        await sendMessage(
          ctx,
          "Error: The bot does not have permission to send photos in chat"
        );
      } else if (e.error_code === 429) {
        this.botSuspended = true;
        const retryAfter = e.parameters.retry_after
          ? e.parameters.retry_after < 60
            ? 60
            : e.parameters.retry_after * 2
          : 60;
        const method = e.method;
        const errorMessage = `On method "${method}" | ${e.error_code} - ${e.description}`;
        this.logger.error(errorMessage);
        await sendMessage(
          ctx,
          `${
            ctx.from.username ? ctx.from.username : ""
          } Bot has reached limit, wait ${retryAfter} seconds`
        ).catch((e) => this.onError(ctx, e, retryCount - 1));
        if (method === "editMessageText") {
          ctx.session.vertex.chatConversation.pop(); //deletes last prompt
        }
        await sleep(retryAfter * 1000); // wait retryAfter seconds to enable bot
        this.botSuspended = false;
      } else {
        this.logger.error(
          `On method "${e.method}" | ${e.error_code} - ${e.description}`
        );
      }
    } else {
      this.logger.error(`${e.toString()}`);
      await sendMessage(ctx, "Error handling your request").catch((e) =>
        this.onError(ctx, e, retryCount - 1)
      );
    }
  }
}
