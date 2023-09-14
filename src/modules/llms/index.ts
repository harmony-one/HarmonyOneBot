import { GrammyError } from 'grammy'
import { type Logger, pino } from 'pino'

import { getCommandNamePrompt } from '../1country/utils'
import { type BotPayments } from '../payment'
import {
  type OnMessageContext,
  type OnCallBackQueryData,
  type ChatConversation,
  type ChatPayload
} from '../types'
import { appText } from '../open-ai/utils/text'
import { chatService } from '../../database/services'
import config from '../../config'
import { sleep } from '../sd-images/utils'
import {
  getPromptPrice,
  hasPrefix,
  isMentioned,
  limitPrompt,
  MAX_TRIES,
  prepareConversation,
  preparePrompt,
  sendMessage,
  SupportedCommands
} from './helpers'
import { vertexCompletion } from './api/vertex'
import { type LlmCompletion, llmCompletion } from './api/liteLlm'
import { LlmsModelsEnum } from './types'
export class LlmsBot {
  private readonly logger: Logger
  private readonly payments: BotPayments
  private botSuspended: boolean

  constructor (payments: BotPayments) {
    this.logger = pino({
      name: 'LlmsBot',
      transport: {
        target: 'pino-pretty',
        options: { colorize: true }
      }
    })
    this.botSuspended = false
    this.payments = payments
  }

  public async isSupportedEvent (
    ctx: OnMessageContext | OnCallBackQueryData
  ): Promise<boolean> {
    const hasCommand = ctx.hasCommand(
      Object.values(SupportedCommands).map((command) => command.name)
    )
    if (isMentioned(ctx)) {
      return true
    }
    const chatPrefix = hasPrefix(ctx.message?.text || '')
    if (chatPrefix !== '') {
      return true
    }
    return hasCommand
  }

  public getEstimatedPrice (ctx: any): number {
    return 0
  }

  public async onEvent (ctx: OnMessageContext | OnCallBackQueryData) {
    if (!this.isSupportedEvent(ctx) && ctx.chat?.type !== 'private') {
      this.logger.warn(`### unsupported command ${ctx.message?.text}`)
      return false
    }

    if (ctx.hasCommand(SupportedCommands.palm.name)) {
      this.onChat(ctx, LlmsModelsEnum.BISON)
      return
    }

    if (ctx.hasCommand(SupportedCommands.bard.name)) {
      this.onChat(ctx, LlmsModelsEnum.BISON)
      return
    }

    this.logger.warn('### unsupported command')
    sendMessage(ctx, '### unsupported command').catch(async (e) => { await this.onError(ctx, e, MAX_TRIES, '### unsupported command') }
    )
  }

  private async hasBalance (ctx: OnMessageContext | OnCallBackQueryData) {
    const accountId = this.payments.getAccountId(ctx as OnMessageContext)
    const addressBalance = await this.payments.getUserBalance(accountId)
    const creditsBalance = await chatService.getBalance(accountId)
    const balance = addressBalance.plus(creditsBalance)
    const balanceOne = (await this.payments.toONE(balance, false)).toFixed(2)
    return (
      +balanceOne > +config.llms.minimumBalance ||
      (await this.payments.isUserInWhitelist(ctx.from.id, ctx.from.username))
    )
  }

  private async promptGen (data: ChatPayload) {
    const { conversation, ctx, model } = data
    try {
      const msgId = (
        await ctx.reply('...', { message_thread_id: ctx.message?.message_thread_id })
      ).message_id
      ctx.chatAction = 'typing'
      let response: LlmCompletion = {
        completion: undefined,
        usage: 0,
        price: 0
      }
      const chat = prepareConversation(conversation, model)
      if (model === LlmsModelsEnum.BISON) {
        response = await vertexCompletion(chat, model) // "chat-bison@001");
      } else {
        response = await llmCompletion(chat, model)
      }
      if (response.completion) {
        ctx.api.editMessageText(
          ctx.chat?.id!,
          msgId,
          response.completion.content
        )
        conversation.push(response.completion)
        // const price = getPromptPrice(completion, data);
        // this.logger.info(
        //   `streamChatCompletion result = tokens: ${
        //     price.promptTokens + price.completionTokens
        //   } | ${model} | price: ${price}¢`
        // );
        return {
          price: 0,
          chat: conversation
        }
      }
      ctx.chatAction = null

      return {
        price: 0,
        chat: conversation
      }
    } catch (e: any) {
      ctx.chatAction = null
      throw e
    }
  }

  async onPrefix (ctx: OnMessageContext | OnCallBackQueryData, model: string) {
    try {
      if (this.botSuspended) {
        sendMessage(ctx, 'The bot is suspended').catch(async (e) => { await this.onError(ctx, e) }
        )
        return
      }
      const { prompt, commandName } = getCommandNamePrompt(
        ctx,
        SupportedCommands
      )
      const prefix = hasPrefix(prompt)
      ctx.session.llms.requestQueue.push({
        content: await preparePrompt(ctx, prompt.slice(prefix.length)),
        model
      })
      if (!ctx.session.llms.isProcessingQueue) {
        ctx.session.llms.isProcessingQueue = true
        this.onChatRequestHandler(ctx).then(() => {
          ctx.session.llms.isProcessingQueue = false
        })
      }
    } catch (e) {
      this.onError(ctx, e)
    }
  }

  async onChat (ctx: OnMessageContext | OnCallBackQueryData, model: string) {
    try {
      if (this.botSuspended) {
        sendMessage(ctx, 'The bot is suspended').catch(async (e) => { await this.onError(ctx, e) }
        )
        return
      }
      const prompt = ctx.match ? ctx.match : ctx.message?.text
      ctx.session.llms.requestQueue.push({
        model,
        content: await preparePrompt(ctx, prompt as string)
      })
      if (!ctx.session.llms.isProcessingQueue) {
        ctx.session.llms.isProcessingQueue = true
        this.onChatRequestHandler(ctx).then(() => {
          ctx.session.llms.isProcessingQueue = false
        })
      }
    } catch (e: any) {
      this.onError(ctx, e)
    }
  }

  async onChatRequestHandler (ctx: OnMessageContext | OnCallBackQueryData) {
    while (ctx.session.llms.requestQueue.length > 0) {
      try {
        const msg = ctx.session.llms.requestQueue.shift()
        const prompt = msg?.content
        const model = msg?.model
        const { chatConversation } = ctx.session.llms
        if (await this.hasBalance(ctx)) {
          if (prompt === '') {
            const msg =
              chatConversation.length > 0
                ? `${appText.gptLast}\n_${
                    chatConversation[chatConversation.length - 1].content
                  }_`
                : appText.introText
            await sendMessage(ctx, msg, { parseMode: 'Markdown' }).catch(async (e) => { await this.onError(ctx, e) })
            return
          }
          const chat: ChatConversation = {
            content: limitPrompt(prompt!),
            model
          }
          if (model === LlmsModelsEnum.BISON) {
            chat.author = 'user'
          } else {
            chat.role = 'user'
          }
          chatConversation.push(chat)
          const payload = {
            conversation: chatConversation,
            model: model || config.llms.model,
            ctx
          }
          const result = await this.promptGen(payload)
          ctx.session.llms.chatConversation = [...result.chat]
          if (
            !(await this.payments.pay(ctx as OnMessageContext, result.price))
          ) {
            this.onNotBalanceMessage(ctx)
          }
          ctx.chatAction = null
        } else {
          this.onNotBalanceMessage(ctx)
        }
      } catch (e: any) {
        this.onError(ctx, e)
      }
    }
  }

  async onEnd (ctx: OnMessageContext | OnCallBackQueryData) {
    ctx.session.llms.chatConversation = []
    ctx.session.llms.usage = 0
    ctx.session.llms.price = 0
  }

  async onNotBalanceMessage (ctx: OnMessageContext | OnCallBackQueryData) {
    const accountId = this.payments.getAccountId(ctx as OnMessageContext)
    const account = await this.payments.getUserAccount(accountId)
    const addressBalance = await this.payments.getUserBalance(accountId)
    const creditsBalance = await chatService.getBalance(accountId)
    const balance = addressBalance.plus(creditsBalance)
    const balanceOne = (await this.payments.toONE(balance, false)).toFixed(2)
    const balanceMessage = appText.notEnoughBalance
      .replaceAll('$CREDITS', balanceOne)
      .replaceAll('$WALLET_ADDRESS', account?.address || '')
    await sendMessage(ctx, balanceMessage, { parseMode: 'Markdown' }).catch(async (e) => { await this.onError(ctx, e) })
  }

  async onError (
    ctx: OnMessageContext | OnCallBackQueryData,
    e: any,
    retryCount: number = MAX_TRIES,
    msg?: string
  ) {
    if (retryCount === 0) {
      // Retry limit reached, log an error or take alternative action
      this.logger.error(`Retry limit reached for error: ${e}`)
      return
    }
    if (e instanceof GrammyError) {
      if (e.error_code === 400 && e.description.includes('not enough rights')) {
        await sendMessage(
          ctx,
          'Error: The bot does not have permission to send photos in chat'
        )
      } else if (e.error_code === 429) {
        this.botSuspended = true
        const retryAfter = e.parameters.retry_after
          ? e.parameters.retry_after < 60
            ? 60
            : e.parameters.retry_after * 2
          : 60
        const method = e.method
        const errorMessage = `On method "${method}" | ${e.error_code} - ${e.description}`
        this.logger.error(errorMessage)
        await sendMessage(
          ctx,
          `${
            ctx.from.username ? ctx.from.username : ''
          } Bot has reached limit, wait ${retryAfter} seconds`
        ).catch(async (e) => { await this.onError(ctx, e, retryCount - 1) })
        if (method === 'editMessageText') {
          ctx.session.llms.chatConversation.pop() // deletes last prompt
        }
        await sleep(retryAfter * 1000) // wait retryAfter seconds to enable bot
        this.botSuspended = false
      } else {
        this.logger.error(
          `On method "${e.method}" | ${e.error_code} - ${e.description}`
        )
      }
    } else {
      this.logger.error(`${e.toString()}`)
      await sendMessage(ctx, 'Error handling your request').catch(async (e) => { await this.onError(ctx, e, retryCount - 1) }
      )
    }
  }
}
