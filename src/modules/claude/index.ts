import { GrammyError } from 'grammy'
import { type Logger, pino } from 'pino'

import { getCommandNamePrompt } from '../1country/utils'
import { type BotPayments } from '../payment'
import {
  type OnMessageContext,
  type OnCallBackQueryData,
  type ChatConversation,
  type ChatPayload,
  type PayableBot,
  RequestState
} from '../types'
import { appText } from '../open-ai/utils/text'
import { chatService } from '../../database/services'
import config from '../../config'
import { sleep } from '../sd-images/utils'
import {
  hasClaudeOpusPrefix,
  hasPrefix,
  SupportedCommands
} from './helpers'
import {
  getPromptPrice,
  hasUrl,
  isMentioned,
  limitPrompt,
  MAX_TRIES
} from '../llms/helpers'
import { preparePrompt, sendMessage } from '../open-ai/helpers'
import { type LlmCompletion, deleteCollection } from '../llms/api/llmApi'
import { LlmsModelsEnum } from '../llms/types'
import * as Sentry from '@sentry/node'
import { now } from '../../utils/perf'
import { AxiosError } from 'axios'
import OpenAI from 'openai'
import { anthropicCompletion, anthropicStreamCompletion } from '../llms/api/athropic'
export class ClaudeBot implements PayableBot {
  public readonly module = 'ClaudeBot'
  private readonly logger: Logger
  private readonly payments: BotPayments
  private botSuspended: boolean

  constructor (payments: BotPayments) {
    this.logger = pino({
      name: 'ClaudeBot',
      transport: {
        target: 'pino-pretty',
        options: { colorize: true }
      }
    })
    this.botSuspended = false
    this.payments = payments
  }

  public getEstimatedPrice (ctx: any): number {
    return 0
  }

  public isSupportedEvent (
    ctx: OnMessageContext | OnCallBackQueryData
  ): boolean {
    const hasCommand = ctx.hasCommand(
      Object.values(SupportedCommands).map((command) => command)
    )
    if (isMentioned(ctx)) {
      return true
    }
    const chatPrefix = hasPrefix(ctx.message?.text ?? '')
    if (chatPrefix !== '') {
      return true
    }
    return hasCommand || !!hasUrl
  }

  public async onEvent (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    ctx.transient.analytics.module = this.module
    const isSupportedEvent = this.isSupportedEvent(ctx)
    if (!isSupportedEvent && ctx.chat?.type !== 'private') {
      this.logger.warn(`### unsupported command ${ctx.message?.text}`)
      return
    }

    if (ctx.hasCommand([SupportedCommands.claudeOpus, SupportedCommands.opus, SupportedCommands.opusShort]) || (hasClaudeOpusPrefix(ctx.message?.text ?? '') !== '')) {
      await this.onChat(ctx, LlmsModelsEnum.CLAUDE_OPUS)
      return
    }
    if (ctx.hasCommand([SupportedCommands.claudeSonnet, SupportedCommands.sonnet, SupportedCommands.sonnetShort])) {
      await this.onChat(ctx, LlmsModelsEnum.CLAUDE_SONNET)
      return
    }
    if (ctx.hasCommand([SupportedCommands.claudeHaiku, SupportedCommands.haikuShort])) {
      await this.onChat(ctx, LlmsModelsEnum.CLAUDE_HAIKU)
      return
    }

    ctx.transient.analytics.actualResponseTime = now()
  }

  private async hasBalance (ctx: OnMessageContext | OnCallBackQueryData): Promise<boolean> {
    const accountId = this.payments.getAccountId(ctx)
    const addressBalance = await this.payments.getUserBalance(accountId)
    const { totalCreditsAmount } = await chatService.getUserCredits(accountId)
    const balance = addressBalance.plus(totalCreditsAmount)
    const balanceOne = this.payments.toONE(balance, false).toFixed(2)
    return (
      +balanceOne > +config.llms.minimumBalance ||
      (this.payments.isUserInWhitelist(ctx.from.id, ctx.from.username))
    )
  }

  private async completionGen (data: ChatPayload, msgId?: number, outputFormat = 'text'): Promise< { price: number, chat: ChatConversation[] }> {
    const { conversation, ctx, model } = data
    try {
      if (!msgId) {
        ctx.transient.analytics.firstResponseTime = now()
        msgId = (
          await ctx.reply('...', {
            message_thread_id:
              ctx.message?.message_thread_id ??
              ctx.message?.reply_to_message?.message_thread_id
          })
        ).message_id
      }
      if (outputFormat === 'text') {
        const isTypingEnabled = config.openAi.chatGpt.isTypingEnabled
        if (isTypingEnabled) {
          ctx.chatAction = 'typing'
        }
        const completion = await anthropicStreamCompletion(
          conversation,
          model as LlmsModelsEnum,
          ctx,
          msgId,
          true // telegram messages has a character limit
        )
        if (isTypingEnabled) {
          ctx.chatAction = null
        }
        if (completion) {
          ctx.transient.analytics.sessionState = RequestState.Success
          ctx.transient.analytics.actualResponseTime = now()
          const price = getPromptPrice(completion, data)
          this.logger.info(
            `streamChatCompletion result = tokens: ${price.promptTokens + price.completionTokens} | ${model} | price: ${price.price}¢` //   }
          )
          conversation.push({
            role: 'assistant',
            content: completion.completion?.content ?? ''
          })
          return {
            price: price.price,
            chat: conversation
          }
        }
      } else {
        const response = await anthropicCompletion(conversation, model as LlmsModelsEnum)
        conversation.push({
          role: 'assistant',
          content: response.completion?.content ?? ''
        })
        return {
          price: response.price,
          chat: conversation
        }
      }
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

  private async promptGen (data: ChatPayload): Promise<{ price: number, chat: ChatConversation[] }> {
    const { conversation, ctx, model } = data
    if (!ctx.chat?.id) {
      throw new Error('internal error')
    }
    const msgId = (
      await ctx.reply('...', { message_thread_id: ctx.message?.message_thread_id })
    ).message_id
    ctx.chatAction = 'typing'
    let response: LlmCompletion = {
      completion: undefined,
      usage: 0,
      price: 0
    }
    const chat = conversation
    response = await anthropicCompletion(chat, model as LlmsModelsEnum)
    if (response.completion) {
      await ctx.api.editMessageText(
        ctx.chat.id,
        msgId,
        response.completion.content as string
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
    // ctx.chatAction = null
    ctx.transient.analytics.actualResponseTime = now()
    return {
      price: 0,
      chat: conversation
    }
  }

  async onPrefix (ctx: OnMessageContext | OnCallBackQueryData, model: string): Promise<void> {
    try {
      if (this.botSuspended) {
        ctx.transient.analytics.sessionState = RequestState.Error
        sendMessage(ctx, 'The bot is suspended').catch(async (e) => { await this.onError(ctx, e) })
        ctx.transient.analytics.actualResponseTime = now()
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
        ctx.transient.analytics.sessionState = RequestState.Error
        sendMessage(ctx, 'The bot is suspended').catch(async (e) => { await this.onError(ctx, e) })
        ctx.transient.analytics.actualResponseTime = now()
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
      ctx.transient.analytics.actualResponseTime = now()
    } catch (e: any) {
      await this.onError(ctx, e)
    }
  }

  async onChatRequestHandler (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    while (ctx.session.llms.requestQueue.length > 0) {
      try {
        const msg = ctx.session.llms.requestQueue.shift()
        const prompt = msg?.content as string
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
            ctx.transient.analytics.sessionState = RequestState.Success
            await sendMessage(ctx, msg, { parseMode: 'Markdown' }).catch(async (e) => {
              await this.onError(ctx, e)
            })
            ctx.transient.analytics.actualResponseTime = now()
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
          let result: { price: number, chat: ChatConversation[] } = { price: 0, chat: [] }
          if (model === LlmsModelsEnum.CLAUDE_OPUS || model === LlmsModelsEnum.CLAUDE_SONNET || model === LlmsModelsEnum.GEMINI) {
            result = await this.completionGen(payload) // , prompt.msgId, prompt.outputFormat)
          } else {
            result = await this.promptGen(payload)
          }
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
        ctx.session.llms.chatConversation = []
        await this.onError(ctx, e)
      }
    }
  }

  async onStop (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    for (const c of ctx.session.collections.activeCollections) {
      this.logger.info(`Deleting collection ${c.collectionName}`)
      await deleteCollection(c.collectionName)
    }
    ctx.session.collections.activeCollections = []
    ctx.session.collections.collectionConversation = []
    ctx.session.collections.collectionRequestQueue = []
    ctx.session.collections.currentCollection = ''
    ctx.session.collections.isProcessingQueue = false
    ctx.session.llms.chatConversation = []
    ctx.session.llms.usage = 0
    ctx.session.llms.price = 0
  }

  async onNotBalanceMessage (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    const accountId = this.payments.getAccountId(ctx)
    const account = this.payments.getUserAccount(accountId)
    const addressBalance = await this.payments.getUserBalance(accountId)
    const { totalCreditsAmount } = await chatService.getUserCredits(accountId)
    const balance = addressBalance.plus(totalCreditsAmount)
    const balanceOne = this.payments.toONE(balance, false).toFixed(2)
    const balanceMessage = appText.notEnoughBalance
      .replaceAll('$CREDITS', balanceOne)
      .replaceAll('$WALLET_ADDRESS', account?.address ?? '')
    ctx.transient.analytics.sessionState = RequestState.Success
    await sendMessage(ctx, balanceMessage, { parseMode: 'Markdown' }).catch(async (e) => { await this.onError(ctx, e) })
    ctx.transient.analytics.actualResponseTime = now()
  }

  async onError (
    ctx: OnMessageContext | OnCallBackQueryData,
    e: any,
    retryCount: number = MAX_TRIES,
    msg?: string
  ): Promise<void> {
    ctx.transient.analytics.sessionState = RequestState.Error
    Sentry.setContext('llms', { retryCount, msg })
    Sentry.captureException(e)
    ctx.chatAction = null
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
        ctx.transient.analytics.actualResponseTime = now()
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
        ctx.transient.analytics.actualResponseTime = now()
        if (method === 'editMessageText') {
          ctx.session.llms.chatConversation.pop() // deletes last prompt
        }
        await sleep(retryAfter * 1000) // wait retryAfter seconds to enable bot
        this.botSuspended = false
      } else {
        this.logger.error(
          `On method "${e.method}" | ${e.error_code} - ${e.description}`
        )
        ctx.transient.analytics.actualResponseTime = now()
        await sendMessage(ctx, 'Error handling your request').catch(async (e) => { await this.onError(ctx, e, retryCount - 1) })
      }
    } else if (e instanceof OpenAI.APIError) {
      // 429 RateLimitError
      // e.status = 400 || e.code = BadRequestError
      this.logger.error(`OPENAI Error ${e.status}(${e.code}) - ${e.message}`)
      if (e.code === 'context_length_exceeded') {
        await sendMessage(ctx, e.message).catch(async (e) => { await this.onError(ctx, e, retryCount - 1) })
        ctx.transient.analytics.actualResponseTime = now()
        await this.onStop(ctx)
      } else {
        await sendMessage(
          ctx,
          'Error accessing OpenAI (ChatGPT). Please try later'
        ).catch(async (e) => { await this.onError(ctx, e, retryCount - 1) })
        ctx.transient.analytics.actualResponseTime = now()
      }
    } else if (e instanceof AxiosError) {
      this.logger.error(`${e.message}`)
      await sendMessage(ctx, 'Error handling your request').catch(async (e) => {
        await this.onError(ctx, e, retryCount - 1)
      })
    } else {
      this.logger.error(`${e.toString()}`)
      await sendMessage(ctx, 'Error handling your request')
        .catch(async (e) => { await this.onError(ctx, e, retryCount - 1) }
        )
      ctx.transient.analytics.actualResponseTime = now()
    }
  }
}
