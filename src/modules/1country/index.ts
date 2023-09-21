import { InlineKeyboard } from 'grammy'
import { relayApi } from './api/relayApi'
import { AxiosError } from 'axios'
import { isDomainAvailable, validateDomainName } from './utils/domain'
import { appText } from './utils/text'
import { type OnMessageContext, type OnCallBackQueryData, type PayableBot, SessionState } from '../types'
import { getCommandNamePrompt, getUrl } from './utils/'
import { type Logger, pino } from 'pino'
import { isAdmin } from '../open-ai/utils/context'
import config from '../../config'
import * as Sentry from '@sentry/node'

export const SupportedCommands = {
  register: {
    name: 'register',
    groupParams: '>0',
    privateParams: '>0'
  },
  visit: {
    name: 'visit',
    groupParams: '=1', // TODO: add support for groups
    privateParams: '=1'
  },
  check: {
    name: 'check',
    groupParams: '=1', // TODO: add support for groups
    privateParams: '=1'
  },
  cert: {
    name: 'cert',
    groupParams: '=1', // TODO: add support for groups
    privateParams: '=1'
  },
  nft: {
    name: 'nft',
    groupParams: '=1', // TODO: add support for groups
    privateParams: '=1'
  }
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

  constructor () {
    this.logger = pino({
      name: 'OneCountryBot-conversation',
      transport: {
        target: 'pino-pretty',
        options: { colorize: true }
      }
    })
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

  public isValidCommand (ctx: OnMessageContext | OnCallBackQueryData): boolean {
    const { commandName, prompt } = getCommandNamePrompt(
      ctx,
      SupportedCommands
    )
    const promptNumber = prompt === '' ? 0 : prompt.split(' ').length
    if (!commandName) {
      const hasGroupPrefix = this.hasPrefix(ctx.message?.text ?? '')
      if (hasGroupPrefix && promptNumber > 1) {
        return true
      }
      return false
    }
    const command = Object.values(SupportedCommands).filter((c) =>
      commandName.includes(c.name)
    )[0]
    const comparisonOperator =
      ctx.chat?.type === 'private'
        ? command.privateParams[0]
        : command.groupParams[0]
    const comparisonValue = parseInt(
      ctx.chat?.type === 'private'
        ? command.privateParams.slice(1)
        : command.groupParams.slice(1)
    )
    switch (comparisonOperator) {
      case '>':
        if (promptNumber >= comparisonValue) {
          return true
        }
        break
      case '=':
        if (promptNumber === comparisonValue) {
          return true
        }
        break
      default:
        break
    }
    return false
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

  async onRegister (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
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
      const keyboard = new InlineKeyboard().webApp(
        'Rent in 1.country',
        `${config.country.hostname}?domain=${lastDomain}`
      )
      await ctx.reply(`Rent ${lastDomain}`, {
        reply_markup: keyboard,
        message_thread_id: ctx.message?.message_thread_id
      })
      ctx.session.analytics.actualResponseTime = process.hrtime.bigint()
      ctx.session.analytics.sessionState = SessionState.Success
      return
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
        msg += 'is available ✅.\n'
        if (!response.priceUSD.error) {
          msg += `${response.priceOne} ONE = ${response.priceUSD.price} USD for 30 days\n`
        } else {
          msg += `${response.priceOne} for 30 days\n`
        }
        msg += `${appText.registerConfirmation}, or ${appText.registerKeepWriting}`
      }
      if (ctx.chat?.id) {
        await ctx.api.editMessageText(ctx.chat.id, msgId, msg, { parse_mode: 'Markdown' })
      }
      ctx.session.analytics.sessionState = SessionState.Success
      ctx.session.analytics.actualResponseTime = performance.now()
    } catch (e) {
      console.log(e)
    }
    ctx.session.analytics.sessionState = SessionState.Success
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
}
