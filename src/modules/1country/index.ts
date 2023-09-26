import { GrammyError, InlineKeyboard } from 'grammy'
import { AxiosError } from 'axios'
import * as Sentry from '@sentry/node'
import { type Logger, pino } from 'pino'

import { chatService } from '../../database/services'
import { relayApi } from './api/relayApi'
import { isDomainAvailable, validateDomainName } from './utils/domain'
import { appText } from './utils/text'
import { type OnMessageContext, type OnCallBackQueryData, type PayableBot, SessionState } from '../types'
import { type BotPayments } from '../payment'
import { getCommandNamePrompt, getUrl } from './utils/'
import { isAdmin } from '../open-ai/utils/context'
import config from '../../config'
import { MAX_TRIES, sendMessage } from '../open-ai/helpers'
import { sleep } from '../sd-images/utils'
import { isValidUrl } from '../open-ai/utils/web-crawler'

export const SupportedCommands = {
  register: { name: 'rent' },
  visit: { name: 'visit' },
  check: { name: 'check' },
  cert: { name: 'cert' },
  nft: { name: 'nft' },
  set: { name: 'set' }
}

// enum SupportedCommands {
//   CHECK = "check",
//   NFT = "nft",
//   VISIT = "visit",
//   CERT = "cert",
//   RENEW = "renew",
//   NOTION = "notion",
//   SUBDOMAIN = "subdomain",
// }

export class OneCountryBot implements PayableBot {
  public readonly module = 'OneCountryBot'
  private readonly logger: Logger
  private readonly payments: BotPayments
  private botSuspended: boolean

  constructor (payments: BotPayments) {
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

  public isSupportedEvent (
    ctx: OnMessageContext | OnCallBackQueryData
  ): boolean {
    const hasCommand = ctx.hasCommand(
      Object.values(SupportedCommands).map((command) => command.name)
    )
    const hasPrefix = this.hasPrefix(ctx.message?.text ?? '')
    if (hasPrefix && ctx.session.oneCountry.lastDomain) {
      return true
    }
    return hasCommand
  }

  private hasPrefix (prompt: string): boolean {
    const prefixList = config.country.registerPrefix
    for (let i = 0; i < prefixList.length; i++) {
      if (prompt.toLocaleLowerCase().startsWith(prefixList[i])) {
        return true
      }
    }
    return false
  }

  public getEstimatedPrice (ctx: any): number {
    return 0
  }

  public async onEvent (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    ctx.session.analytics.module = this.module
    if (!this.isSupportedEvent(ctx)) {
      this.logger.warn(`### unsupported command ${ctx.message?.text}`)
      return
    }

    if (ctx.hasCommand(SupportedCommands.visit.name)) {
      await this.onVistitCmd(ctx)
      return
    }

    if (ctx.hasCommand(SupportedCommands.check.name)) {
      await this.onCheckCmd(ctx)
      return
    }

    if (ctx.hasCommand(SupportedCommands.register.name)) {
      await this.onRegister(ctx)
      return
    }

    if (this.hasPrefix(ctx.message?.text ?? '')) {
      await this.onRegister(ctx)
      return
    }

    if (ctx.hasCommand(SupportedCommands.nft.name)) {
      await this.onNftCmd(ctx)
      return
    }

    if (ctx.hasCommand(SupportedCommands.cert.name)) {
      await this.onCertCmd(ctx)
      return
    }

    if (ctx.hasCommand(SupportedCommands.set.name)) {
      await this.onSet(ctx)
      return
    }

    // if (ctx.hasCommand(SupportedCommands.RENEW)) {
    //   this.onRenewCmd(ctx);
    //   return;
    // }

    // if (ctx.hasCommand(SupportedCommands.NOTION)) {
    //   this.onNotionCmd(ctx);
    //   return;
    // }

    // if (ctx.hasCommand(SupportedCommands.SUBDOMAIN)) {
    //   this.onEnableSubomain(ctx);
    //   return;
    // }

    this.logger.warn('### unsupported command')
    await ctx.reply('### unsupported command', { message_thread_id: ctx.message?.message_thread_id })
    ctx.session.analytics.actualResponseTime = process.hrtime.bigint()
    ctx.session.analytics.sessionState = SessionState.Error
  }

  onVistitCmd = async (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> => {
    if (this.botSuspended) {
      ctx.session.analytics.sessionState = SessionState.Error
      await sendMessage(ctx, 'The bot is suspended').catch(async (e) => {
        await this.onError(ctx, e)
      })
      ctx.session.analytics.actualResponseTime = process.hrtime.bigint()
      return
    }
    if (!ctx.match) {
      await ctx.reply('Error: Missing 1.country domain', { message_thread_id: ctx.message?.message_thread_id })
      ctx.session.analytics.actualResponseTime = process.hrtime.bigint()
      ctx.session.analytics.sessionState = SessionState.Error
      return
    }

    const url = getUrl(ctx.match as string)
    const keyboard = new InlineKeyboard().webApp('Go', `https://${url}/`)

    await ctx.reply(`Visit ${url}`, {
      reply_markup: keyboard,
      message_thread_id: ctx.message?.message_thread_id
    })
    ctx.session.analytics.actualResponseTime = process.hrtime.bigint()
    ctx.session.analytics.sessionState = SessionState.Success
  }

  onSet = async (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> => {
    try {
      if (this.botSuspended) {
        ctx.session.analytics.sessionState = SessionState.Error
        await sendMessage(ctx, 'The bot is suspended').catch(async (e) => {
          await this.onError(ctx, e)
        })
        ctx.session.analytics.actualResponseTime = process.hrtime.bigint()
        return
      }
      if (!ctx.match) {
        await ctx.reply(appText.setParameterError, {
          message_thread_id: ctx.message?.message_thread_id,
          parse_mode: 'Markdown'
        }).catch(async (e) => {
          await this.onError(ctx, e)
        })
        return
      }
      const params = (ctx.match as string).split(' ')
      if (params.length === 3) {
        const [domain, subdomain, url] = params
        const isDomain = await isDomainAvailable(domain)
        if (isDomain.isAvailable) {
          await ctx.reply(`The domain ${domain} doesn't exist`, {
            message_thread_id: ctx.message?.message_thread_id,
            parse_mode: 'Markdown'
          }).catch(async (e) => {
            await this.onError(ctx, e)
          })
          ctx.session.analytics.actualResponseTime = process.hrtime.bigint()
          ctx.session.analytics.sessionState = SessionState.Error
          return
        }
        if (!isValidUrl(url)) {
          await ctx.reply('The url is not valid', {
            message_thread_id: ctx.message?.message_thread_id,
            parse_mode: 'Markdown'
          }).catch(async (e) => {
            await this.onError(ctx, e)
          })
          ctx.session.analytics.actualResponseTime = process.hrtime.bigint()
          ctx.session.analytics.sessionState = SessionState.Error
          return
        }
        // ************** dc set process ********************
        await ctx.reply('Subdomain created')
        console.log(subdomain)
        ctx.session.analytics.actualResponseTime = process.hrtime.bigint()
        ctx.session.analytics.sessionState = SessionState.Success
        // ****** ////
      } else {
        await ctx.reply(appText.setParameterError, {
          message_thread_id: ctx.message?.message_thread_id,
          parse_mode: 'Markdown'
        }).catch(async (e) => {
          await this.onError(ctx, e)
        })
      }
    } catch (e) {
      ctx.session.analytics.sessionState = SessionState.Error
      ctx.session.analytics.actualResponseTime = process.hrtime.bigint()
      await this.onError(ctx, e)
    }
  }

  async onRegister (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    try {
      if (this.botSuspended) {
        ctx.session.analytics.sessionState = SessionState.Error
        await sendMessage(ctx, 'The bot is suspended').catch(async (e) => {
          await this.onError(ctx, e)
        })
        ctx.session.analytics.actualResponseTime = process.hrtime.bigint()
        return
      }
      const { prompt } = getCommandNamePrompt(ctx, SupportedCommands)
      const lastDomain = ctx.session.oneCountry.lastDomain
      let msgId = 0
      if (!prompt && !lastDomain) {
        await ctx.reply('Write a domain name', { message_thread_id: ctx.message?.message_thread_id })
        ctx.session.analytics.actualResponseTime = process.hrtime.bigint()
        ctx.session.analytics.sessionState = SessionState.Error
        return
      }
      if (!prompt && lastDomain) {
        // ************** dc rent process ********************
        if (
          !(await this.payments.rent(ctx as OnMessageContext, lastDomain)) // to be implemented
        ) {
          await this.onNotBalanceMessage(ctx)
          ctx.session.analytics.sessionState = SessionState.Error
          ctx.session.analytics.actualResponseTime = process.hrtime.bigint()
        } else {
          const fullUrl = getUrl(lastDomain, true)
          await ctx.reply(`The Domain ${fullUrl} was registered`, {
            parse_mode: 'Markdown',
            message_thread_id: ctx.message?.message_thread_id
          })
          // await ctx.reply(`The Domain [${fullUrl}](${config.country.hostname}/new?domain=${lastDomain}) was registered`, {
          //   parse_mode: 'Markdown',
          //   message_thread_id: ctx.message?.message_thread_id,
          //   disable_web_page_preview: false
          // })
          ctx.session.analytics.sessionState = SessionState.Success
          ctx.session.analytics.actualResponseTime = process.hrtime.bigint()
          return
        }
      }
      const domain = this.cleanInput(
        this.hasPrefix(prompt) ? prompt.slice(1) : prompt
      )
      const validate = validateDomainName(domain)
      if (!validate.valid) {
        await ctx.reply(validate.error, {
          parse_mode: 'Markdown',
          message_thread_id: ctx.message?.message_thread_id
        })
        ctx.session.analytics.actualResponseTime = process.hrtime.bigint()
        ctx.session.analytics.sessionState = SessionState.Error
        return
      }
      ctx.session.oneCountry.lastDomain = domain
      msgId = (await ctx.reply('Checking name...')).message_id
      ctx.session.analytics.firstResponseTime = process.hrtime.bigint()
      const response = await isDomainAvailable(domain)
      const domainAvailable = response.isAvailable
      let msg = `The name *${domain}* `
      if (!domainAvailable && response.isInGracePeriod) {
        msg += 'is in grace period ❌. Only the owner is able to renew the domain'
      } else if (!domainAvailable) {
        msg += `is unavailable ❌.\n${appText.registerKeepWriting}`
      } else {
        msg += 'is available ✅.\n'
        if (!response.priceUSD.error) {
          msg += `${response.priceOne} ONE = ${response.priceUSD.price} USD for 30 days\n`
        } else {
          msg += `${response.priceOne} for 30 days\n`
        }
        msg += `${appText.registerConfirmation}, or ${appText.registerKeepWriting}`
        ctx.session.analytics.sessionState = SessionState.Success
        ctx.session.analytics.actualResponseTime = process.hrtime.bigint()
      }
      if (ctx.chat?.id) {
        await ctx.api.editMessageText(ctx.chat.id, msgId, msg, { parse_mode: 'Markdown' })
      }
      ctx.session.analytics.sessionState = SessionState.Success
      ctx.session.analytics.actualResponseTime = process.hrtime.bigint()
    } catch (e) {
      ctx.session.analytics.sessionState = SessionState.Error
      ctx.session.analytics.actualResponseTime = process.hrtime.bigint()
      await this.onError(ctx, e)
    }
  }

  async onNotBalanceMessage (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    const accountId = this.payments.getAccountId(ctx as OnMessageContext)
    const account = this.payments.getUserAccount(accountId)
    const addressBalance = await this.payments.getUserBalance(accountId)
    const creditsBalance = await chatService.getBalance(accountId)
    const fiatCreditsBalance = await chatService.getFiatBalance(accountId)
    const balance = addressBalance
      .plus(creditsBalance)
      .plus(fiatCreditsBalance)
    const balanceOne = this.payments.toONE(balance, false).toFixed(2)
    const balanceMessage = appText.notEnoughBalance
      .replaceAll('$CREDITS', balanceOne)
      .replaceAll('$WALLET_ADDRESS', account?.address ?? '')
    ctx.session.analytics.sessionState = SessionState.Error
    await sendMessage(ctx, balanceMessage, { parseMode: 'Markdown' }).catch(async (e) => { await this.onError(ctx, e) })
    ctx.session.analytics.actualResponseTime = process.hrtime.bigint()
  }

  onRenewCmd = async (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> => {
    if (!ctx.match) {
      await ctx.reply('Error: Missing 1.country domain', { message_thread_id: ctx.message?.message_thread_id })
      return
    }
    const url = getUrl(ctx.match as string)
    const keyboard = new InlineKeyboard()
      .webApp('Renew in 1.country', `https://${url}/?renew`)
      .row()
      .webApp(
        'Rent using your local wallet (under construction)',
        `https://${url}/?renew`
      )

    await ctx.reply(`Renew ${url}`, {
      reply_markup: keyboard,
      message_thread_id: ctx.message?.message_thread_id
    })
  }

  onNotionCmd = async (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> => {
    const prompt: any = ctx.match
    if (!prompt) {
      await ctx.reply('Error: Missing alias and url', { message_thread_id: ctx.message?.message_thread_id })
      return
    }
    const [domain = '', alias = '', url = ''] = prompt.split(' ')
    if (domain && alias && url) {
      if (url.includes('notion') || url.includes('substack')) {
        const domainName = getUrl(domain, false)
        const isAvailable = await isDomainAvailable(domainName)
        if (!isAvailable.isAvailable) {
          const keyboard = new InlineKeyboard().webApp(
            'Process the Notion page Renew in 1.country',
            `https://${domainName}.country/?${alias}#=${url}`
          )
          await ctx.reply(`Renew ${url}`, {
            reply_markup: keyboard,
            message_thread_id: ctx.message?.message_thread_id
          })
        } else {
          await ctx.reply('The domain doesn\'t exist', { message_thread_id: ctx.message?.message_thread_id })
        }
      } else {
        await ctx.reply('Invalid url', { message_thread_id: ctx.message?.message_thread_id })
      }
    } else {
      await ctx.reply(appText.notion.promptMissing, {
        parse_mode: 'Markdown',
        message_thread_id: ctx.message?.message_thread_id
      })
    }
  }

  onCertCmd = async (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> => {
    if (await isAdmin(ctx, false, true)) {
      if (!ctx.match) {
        await ctx.reply('Error: Missing 1.country domain', { message_thread_id: ctx.message?.message_thread_id })
        ctx.session.analytics.sessionState = SessionState.Error
        ctx.session.analytics.actualResponseTime = process.hrtime.bigint()
        return
      }
      const url = getUrl(ctx.match as string)
      try {
        const response = await relayApi().createCert({ domain: url })
        if (!response.error) {
          await ctx.reply(`The SSL certificate of ${url} was renewed`, { message_thread_id: ctx.message?.message_thread_id })
          ctx.session.analytics.sessionState = SessionState.Success
        } else {
          await ctx.reply(`${response.error}`, { message_thread_id: ctx.message?.message_thread_id })
          ctx.session.analytics.sessionState = SessionState.Error
        }
      } catch (e) {
        Sentry.captureException(e)
        this.logger.error(
          e instanceof AxiosError ? e.response?.data.error : appText.axiosError
        )
        await ctx.reply(
          e instanceof AxiosError ? e.response?.data.error : appText.axiosError, { message_thread_id: ctx.message?.message_thread_id }
        )
        ctx.session.analytics.sessionState = SessionState.Error
      } finally {
        ctx.session.analytics.actualResponseTime = process.hrtime.bigint()
      }
    } else {
      await ctx.reply('This command is reserved', { message_thread_id: ctx.message?.message_thread_id })
      ctx.session.analytics.sessionState = SessionState.Error
      ctx.session.analytics.actualResponseTime = process.hrtime.bigint()
    }
  }

  onNftCmd = async (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> => {
    const url = getUrl(ctx.match as string)
    if (await isAdmin(ctx, false, true)) {
      try {
        await relayApi().genNFT({ domain: url })
        await ctx.reply('NFT metadata generated', { message_thread_id: ctx.message?.message_thread_id })
        ctx.session.analytics.sessionState = SessionState.Success
      } catch (e) {
        Sentry.captureException(e)
        this.logger.error(
          e instanceof AxiosError
            ? e.response?.data.error
            : 'There was an error processing your request'
        )
        await ctx.reply(
          e instanceof AxiosError
            ? e.response?.data.error
            : 'There was an error processing your request',
          { message_thread_id: ctx.message?.message_thread_id })
        ctx.session.analytics.sessionState = SessionState.Error
      } finally {
        ctx.session.analytics.actualResponseTime = process.hrtime.bigint()
      }
    } else {
      await ctx.reply('This command is reserved', { message_thread_id: ctx.message?.message_thread_id })
      ctx.session.analytics.sessionState = SessionState.Error
      ctx.session.analytics.actualResponseTime = process.hrtime.bigint()
    }
  }

  onCheckCmd = async (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> => {
    if (await isAdmin(ctx, false, true)) {
      const domain = this.cleanInput(ctx.match as string)
      const avaliable = await isDomainAvailable(domain)
      let msg = `The name *${domain}* `
      if (!avaliable.isAvailable && avaliable.isInGracePeriod) {
        msg += 'is in grace period ❌. Only the owner is able to renew the domain'
      } else if (!avaliable.isAvailable) {
        msg += `is unavailable ❌.\nWrite */visit ${domain}* to check it out!`
      } else {
        msg += 'is available ✅.\n'
        if (!avaliable.priceUSD.error) {
          msg += `${avaliable.priceOne} ONE = ${avaliable.priceUSD.price} USD for 30 days\n`
        } else {
          msg += `${avaliable.priceOne} for 30 days\n`
        }
        msg += `Write */rent ${domain}* to purchase it`
      }
      await ctx.reply(msg, {
        parse_mode: 'Markdown',
        message_thread_id: ctx.message?.message_thread_id
      })
      ctx.session.analytics.sessionState = SessionState.Success
    } else {
      await ctx.reply('This command is reserved', { message_thread_id: ctx.message?.message_thread_id })
      ctx.session.analytics.sessionState = SessionState.Error
    }
    ctx.session.analytics.actualResponseTime = process.hrtime.bigint()
  }

  onEnableSubomain = async (ctx: OnMessageContext): Promise<void> => {
    const {
      text,
      from: { id: userId, username }
    } = ctx.update.message
    this.logger.info(`Message from ${username} (${userId}): "${text}"`)
    if (await isAdmin(ctx, false, true)) {
      let domain = this.cleanInput(ctx.match as string)
      domain = getUrl(domain, false)
      const isAvailable = await isDomainAvailable(domain)
      if (!isAvailable.isAvailable) {
        await ctx.reply('Processing the request...', { message_thread_id: ctx.message?.message_thread_id })
        try {
          await relayApi().enableSubdomains(domain)
        } catch (e) {
          Sentry.captureException(e)
          this.logger.error(
            e instanceof AxiosError
              ? e.response?.data
              : 'There was an error processing your request'
          )
          await ctx.reply('There was an error processing your request', { message_thread_id: ctx.message?.message_thread_id })
        }
      }
    } else {
      await ctx.reply('This command is reserved', { message_thread_id: ctx.message?.message_thread_id })
    }
  }

  private readonly cleanInput = (input: string): string => {
    return input.replace(/[^a-z0-9-]/g, '').toLowerCase()
  }

  async onError (
    ctx: OnMessageContext | OnCallBackQueryData,
    ex: any,
    retryCount: number = MAX_TRIES,
    msg?: string
  ): Promise<void> {
    ctx.session.analytics.sessionState = SessionState.Error
    Sentry.setContext('open-ai', { retryCount, msg })
    Sentry.captureException(ex)
    if (retryCount === 0) {
      // Retry limit reached, log an error or take alternative action
      this.logger.error(`Retry limit reached for error: ${ex}`)
      return
    }
    if (ex instanceof GrammyError) {
      if (ex.error_code === 400 && ex.description.includes('not enough rights')) {
        await sendMessage(
          ctx,
          'Error: The bot does not have permission to send photos in chat'
        )
        ctx.session.analytics.actualResponseTime = process.hrtime.bigint()
      } else if (ex.error_code === 429) {
        this.botSuspended = true
        const retryAfter = ex.parameters.retry_after
          ? ex.parameters.retry_after < 60
            ? 60
            : ex.parameters.retry_after * 2
          : 60
        const method = ex.method
        const errorMessage = `On method "${method}" | ${ex.error_code} - ${ex.description}`
        this.logger.error(errorMessage)
        await sendMessage(
          ctx,
          `${
            ctx.from.username ? ctx.from.username : ''
          } Bot has reached limit, wait ${retryAfter} seconds`
        ).catch(async (e) => { await this.onError(ctx, e, retryCount - 1) })
        ctx.session.analytics.actualResponseTime = process.hrtime.bigint()
        if (method === 'editMessageText') {
          ctx.session.openAi.chatGpt.chatConversation.pop() // deletes last prompt
        }
        await sleep(retryAfter * 1000) // wait retryAfter seconds to enable bot
        this.botSuspended = false
      } else {
        this.logger.error(
          `On method "${ex.method}" | ${ex.error_code} - ${ex.description}`
        )
      }
    } else {
      this.logger.error(`${ex.toString()}`)
      await sendMessage(ctx, 'Error handling your request')
        .catch(async (e) => { await this.onError(ctx, e, retryCount - 1) }
        )
      ctx.session.analytics.actualResponseTime = process.hrtime.bigint()
    }
  }
}
