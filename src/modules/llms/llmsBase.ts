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
  getMinBalance,
  getPromptPrice,
  limitPrompt,
  MAX_TRIES,
  SupportedCommands
} from './helpers'
import { preparePrompt, sendMessage } from '../open-ai/helpers'
import { type LlmCompletion, deleteCollection } from './api/llmApi'
import * as Sentry from '@sentry/node'
import { now } from '../../utils/perf'
import { AxiosError } from 'axios'
import OpenAI from 'openai'
import { type LlmsModelsEnum } from './types'

export abstract class LlmsBase implements PayableBot {
  public module: string
  protected readonly logger: Logger
  protected readonly payments: BotPayments
  protected botSuspended: boolean

  constructor (payments: BotPayments, module: string) {
    this.module = module
    this.logger = pino({
      name: this.module,
      transport: {
        target: 'pino-pretty',
        options: { colorize: true }
      }
    })
    this.botSuspended = false
    this.payments = payments
  }

  public abstract onEvent (ctx: OnMessageContext | OnCallBackQueryData, refundCallback: (reason?: string) => void): Promise<void>
  public abstract isSupportedEvent (
    ctx: OnMessageContext | OnCallBackQueryData
  ): boolean

  public abstract getEstimatedPrice (ctx: any): number

  protected abstract chatStreamCompletion (
    conversation: ChatConversation[],
    model: LlmsModelsEnum,
    ctx: OnMessageContext | OnCallBackQueryData,
    msgId: number,
    limitTokens: boolean): Promise<LlmCompletion>

  protected abstract chatCompletion (
    conversation: ChatConversation[],
    model: LlmsModelsEnum
  ): Promise<LlmCompletion>

  protected abstract hasPrefix (prompt: string): string

  async onPrefix (ctx: OnMessageContext | OnCallBackQueryData, model: string, stream: boolean): Promise<void> {
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
      const prefix = this.hasPrefix(prompt)
      ctx.session.llms.requestQueue.push({
        content: await preparePrompt(ctx, prompt.slice(prefix.length)),
        model
      })
      if (!ctx.session.llms.isProcessingQueue) {
        ctx.session.llms.isProcessingQueue = true
        await this.onChatRequestHandler(ctx, stream).then(() => {
          ctx.session.llms.isProcessingQueue = false
        })
      }
    } catch (e) {
      await this.onError(ctx, e)
    }
  }

  async onChat (ctx: OnMessageContext | OnCallBackQueryData, model: string, stream: boolean): Promise<void> {
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
        await this.onChatRequestHandler(ctx, stream).then(() => {
          ctx.session.llms.isProcessingQueue = false
        })
      }
      ctx.transient.analytics.actualResponseTime = now()
    } catch (e: any) {
      await this.onError(ctx, e)
    }
  }

  async onChatRequestHandler (ctx: OnMessageContext | OnCallBackQueryData, stream: boolean): Promise<void> {
    while (ctx.session.llms.requestQueue.length > 0) {
      try {
        const msg = ctx.session.llms.requestQueue.shift()
        const prompt = msg?.content as string
        const model = msg?.model
        const { chatConversation } = ctx.session.llms
        const minBalance = await getMinBalance(ctx, msg?.model as LlmsModelsEnum)
        if (await this.hasBalance(ctx, minBalance)) {
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
            role: 'user',
            model
          }
          chatConversation.push(chat)
          const payload = {
            conversation: chatConversation,
            model: model ?? config.llms.model,
            ctx
          }
          let result: { price: number, chat: ChatConversation[] } = { price: 0, chat: [] }
          if (stream) {
            result = await this.completionGen(payload)
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

  private async hasBalance (ctx: OnMessageContext | OnCallBackQueryData, minBalance = +config.llms.minimumBalance): Promise<boolean> {
    const minBalanceOne = this.payments.toONE(await this.payments.getPriceInONE(minBalance), false)
    const accountId = this.payments.getAccountId(ctx)
    const addressBalance = await this.payments.getUserBalance(accountId)
    const { totalCreditsAmount } = await chatService.getUserCredits(accountId)
    const balance = addressBalance.plus(totalCreditsAmount)
    const balanceOne = this.payments.toONE(balance, false).toFixed(2)
    const isGroupInWhiteList = await this.payments.isGroupInWhitelist(ctx as OnMessageContext)
    return (
      +balanceOne > +minBalanceOne ||
      (this.payments.isUserInWhitelist(ctx.from.id, ctx.from.username)) ||
      isGroupInWhiteList
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
        const completion = await this.chatStreamCompletion(conversation,
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
            content: completion.completion?.content ?? '',
            model
          })
          return {
            price: price.price,
            chat: conversation
          }
        }
      } else {
        const response = await this.chatCompletion(conversation, model as LlmsModelsEnum)
        conversation.push({
          role: 'assistant',
          content: response.completion?.content ?? '',
          model
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
    const response = await this.chatCompletion(conversation, model as LlmsModelsEnum)
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
