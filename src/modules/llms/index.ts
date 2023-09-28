import { GrammyError } from 'grammy'
import { type Logger, pino } from 'pino'

import { getCommandNamePrompt } from '../1country/utils'
import { type BotPayments } from '../payment'
import {
  type OnMessageContext,
  type OnCallBackQueryData,
  type ChatConversation,
  type ChatPayload, type PayableBot, SessionState
} from '../types'
import { appText } from '../open-ai/utils/text'
import { chatService } from '../../database/services'
import config from '../../config'
import { sleep } from '../sd-images/utils'
import {
  hasBardPrefix,
  hasPrefix,
  isMentioned,
  limitPrompt,
  MAX_TRIES,
  prepareConversation,
  SupportedCommands
} from './helpers'
import { preparePrompt, sendMessage } from '../open-ai/helpers'
import { vertexCompletion } from './api/vertex'
import { type LlmCompletion, llmCompletion } from './api/liteLlm'
import { LlmsModelsEnum } from './types'
import * as Sentry from '@sentry/node'
import { handlePdf } from './api/pdfHandler'
export class LlmsBot implements PayableBot {
  public readonly module = 'LlmsBot'
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

  public isSupportedEvent (
    ctx: OnMessageContext | OnCallBackQueryData
  ): boolean {
    const hasCommand = ctx.hasCommand(
      Object.values(SupportedCommands).map((command) => command.name)
    )
    if (isMentioned(ctx)) {
      return true
    }
    const chatPrefix = hasPrefix(ctx.message?.text ?? '')
    if (chatPrefix !== '') {
      return true
    }
    return hasCommand
  }

  public getEstimatedPrice (ctx: any): number {
    return 0
  }

  public async onEvent (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    ctx.session.analytics.module = this.module
    const isSupportedEvent = this.isSupportedEvent(ctx)
    if (!isSupportedEvent && ctx.chat?.type !== 'private') {
      this.logger.warn(`### unsupported command ${ctx.message?.text}`)
      return
    }

    if (hasBardPrefix(ctx.message?.text ?? '') !== '') {
      await this.onPrefix(ctx, LlmsModelsEnum.BISON)
      return
    }
    if (ctx.hasCommand(SupportedCommands.bard.name) || ctx.hasCommand(SupportedCommands.bardF.name)) {
      await this.onChat(ctx, LlmsModelsEnum.BISON)
      return
    }

    if (ctx.hasCommand(SupportedCommands.pdf.name)) {
      await this.onPdfHandler(ctx)
      return
    }
    this.logger.warn('### unsupported command')
    ctx.session.analytics.sessionState = SessionState.Error
    await sendMessage(ctx, '### unsupported command').catch(async (e) => {
      await this.onError(ctx, e, MAX_TRIES, '### unsupported command')
    })
    ctx.session.analytics.actualResponseTime = process.hrtime.bigint()
  }

  private async hasBalance (ctx: OnMessageContext | OnCallBackQueryData): Promise<boolean> {
    const accountId = this.payments.getAccountId(ctx as OnMessageContext)
    const addressBalance = await this.payments.getUserBalance(accountId)
    const { totalCreditsAmount } = await chatService.getUserCredits(accountId)
    const balance = addressBalance.plus(totalCreditsAmount)
    const balanceOne = this.payments.toONE(balance, false).toFixed(2)
    return (
      +balanceOne > +config.llms.minimumBalance ||
      (this.payments.isUserInWhitelist(ctx.from.id, ctx.from.username))
    )
  }

  private async onPdfHandler (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    if (!ctx.chat?.id) {
      throw new Error('internal error')
    }
    try {
      const { chatConversation } = ctx.session.llms
      const msgId = (
        await ctx.reply('...', { message_thread_id: ctx.message?.message_thread_id })
      ).message_id
      const prompt = ctx.match as string
      const response = await handlePdf(prompt)
      if (response.completion) {
        await ctx.api.editMessageText(
          ctx.chat.id,
          msgId,
          response.completion.content
        ).catch(async (e: any) => { await this.onError(ctx, e) })
        if (
          !(await this.payments.pay(ctx as OnMessageContext, response.price))
        ) {
          await this.onNotBalanceMessage(ctx)
          return
        }
        chatConversation.push({
          content: prompt,
          role: 'user'
        })
        chatConversation.push(response.completion)
      }
    } catch (e) {
      await this.onError(ctx, e)
    }
  }

  private async promptGen (data: ChatPayload): Promise<{ price: number, chat: ChatConversation[] }> {
    const { conversation, ctx, model } = data
    if (!ctx.chat?.id) {
      throw new Error('internal error')
    }
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
        await ctx.api.editMessageText(
          ctx.chat.id,
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
      Sentry.captureException(e)
      ctx.chatAction = null
      throw e
    }
  }

  async onPrefix (ctx: OnMessageContext | OnCallBackQueryData, model: string): Promise<void> {
    try {
      if (this.botSuspended) {
        ctx.session.analytics.sessionState = SessionState.Error
        sendMessage(ctx, 'The bot is suspended').catch(async (e) => { await this.onError(ctx, e) })
        ctx.session.analytics.actualResponseTime = process.hrtime.bigint()
        return
      }
      const { prompt } = getCommandNamePrompt(
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
        await this.onChatRequestHandler(ctx).then(() => {
          ctx.session.llms.isProcessingQueue = false
        })
      }
    } catch (e) {
      await this.onError(ctx, e)
    }
  }

  async onChat (ctx: OnMessageContext | OnCallBackQueryData, model: string): Promise<void> {
    try {
      if (this.botSuspended) {
        ctx.session.analytics.sessionState = SessionState.Error
        sendMessage(ctx, 'The bot is suspended').catch(async (e) => { await this.onError(ctx, e) })
        ctx.session.analytics.actualResponseTime = process.hrtime.bigint()
        return
      }
      const prompt = ctx.match ? ctx.match : ctx.message?.text
      ctx.session.llms.requestQueue.push({
        model,
        content: await preparePrompt(ctx, prompt as string)
      })
      if (!ctx.session.llms.isProcessingQueue) {
        ctx.session.llms.isProcessingQueue = true
        await this.onChatRequestHandler(ctx).then(() => {
          ctx.session.llms.isProcessingQueue = false
        })
      }
    } catch (e: any) {
      await this.onError(ctx, e)
    }
  }

  async onChatRequestHandler (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    while (ctx.session.llms.requestQueue.length > 0) {
      try {
        const msg = ctx.session.llms.requestQueue.shift()
        const prompt = msg?.content
        const model = msg?.model
        const { chatConversation } = ctx.session.llms
        if (await this.hasBalance(ctx)) {
          if (!prompt) {
            const msg =
              chatConversation.length > 0
                ? `${appText.gptLast}\n_${
                    chatConversation[chatConversation.length - 1].content
                  }_`
                : appText.introText
            ctx.session.analytics.sessionState = SessionState.Success
            await sendMessage(ctx, msg, { parseMode: 'Markdown' }).catch(async (e) => {
              await this.onError(ctx, e)
            })
            ctx.session.analytics.actualResponseTime = process.hrtime.bigint()
            return
          }
          const chat: ChatConversation = {
            content: limitPrompt(prompt),
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
            model: model ?? config.llms.model,
            ctx
          }
          const result = await this.promptGen(payload)
          ctx.session.llms.chatConversation = [...result.chat]
          if (
            !(await this.payments.pay(ctx as OnMessageContext, result.price))
          ) {
            await this.onNotBalanceMessage(ctx)
          }
          ctx.chatAction = null
        } else {
          await this.onNotBalanceMessage(ctx)
        }
      } catch (e: any) {
        await this.onError(ctx, e)
      }
    }
  }

  async onEnd (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    ctx.session.llms.chatConversation = []
    ctx.session.llms.usage = 0
    ctx.session.llms.price = 0
  }

  async onNotBalanceMessage (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    const accountId = this.payments.getAccountId(ctx as OnMessageContext)
    const account = this.payments.getUserAccount(accountId)
    const addressBalance = await this.payments.getUserBalance(accountId)
    const { totalCreditsAmount } = await chatService.getUserCredits(accountId)
    const balance = addressBalance.plus(totalCreditsAmount)
    const balanceOne = this.payments.toONE(balance, false).toFixed(2)
    const balanceMessage = appText.notEnoughBalance
      .replaceAll('$CREDITS', balanceOne)
      .replaceAll('$WALLET_ADDRESS', account?.address ?? '')
    ctx.session.analytics.sessionState = SessionState.Success
    await sendMessage(ctx, balanceMessage, { parseMode: 'Markdown' }).catch(async (e) => { await this.onError(ctx, e) })
    ctx.session.analytics.actualResponseTime = process.hrtime.bigint()
  }

  async onError (
    ctx: OnMessageContext | OnCallBackQueryData,
    e: any,
    retryCount: number = MAX_TRIES,
    msg?: string
  ): Promise<void> {
    ctx.session.analytics.sessionState = SessionState.Error
    Sentry.setContext('llms', { retryCount, msg })
    Sentry.captureException(e)
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
        ctx.session.analytics.actualResponseTime = process.hrtime.bigint()
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
        ctx.session.analytics.actualResponseTime = process.hrtime.bigint()
        if (method === 'editMessageText') {
          ctx.session.llms.chatConversation.pop() // deletes last prompt
        }
        await sleep(retryAfter * 1000) // wait retryAfter seconds to enable bot
        this.botSuspended = false
      } else {
        this.logger.error(
          `On method "${e.method}" | ${e.error_code} - ${e.description}`
        )
        ctx.session.analytics.actualResponseTime = process.hrtime.bigint()
      }
    } else {
      this.logger.error(`${e.toString()}`)
      await sendMessage(ctx, 'Error handling your request').catch(async (e) => { await this.onError(ctx, e, retryCount - 1) })
      ctx.session.analytics.actualResponseTime = process.hrtime.bigint()
    }
  }
}
