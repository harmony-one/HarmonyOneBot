import { type Logger, pino } from 'pino'

import { type BotPayments } from '../payment'
import {
  type OnMessageContext,
  type OnCallBackQueryData,
  type PayableBot,
  RequestState,
  type BotSessionData,
  type SubagentSessionData,
  type SubagentResult,
  SubagentStatus,
  type ChatConversation
} from '../types'
import { appText } from '../../utils/text'
import { chatService } from '../../database/services'

import { now } from '../../utils/perf'
import { ErrorHandler } from '../errorhandler'
import { sleep } from '../sd-images/utils'

export abstract class AgentBase implements PayableBot {
  private readonly sessionDataKey: string
  protected completionContext: string
  public agentName: string
  protected readonly logger: Logger
  protected readonly payments: BotPayments
  public module: string
  errorHandler: ErrorHandler

  constructor (payments: BotPayments,
    module: string,
    agentName: string,
    context: string
  ) {
    this.module = module
    this.logger = pino({
      name: this.module,
      transport: {
        target: 'pino-pretty',
        options: { colorize: true }
      }
    })
    this.agentName = agentName
    this.payments = payments
    this.completionContext = context
    this.sessionDataKey = 'subagents'
    this.errorHandler = new ErrorHandler()
  }

  public abstract run (ctx: OnMessageContext | OnCallBackQueryData, msg: ChatConversation): Promise<SubagentResult>

  protected abstract checkStatus (ctx: OnMessageContext | OnCallBackQueryData, agent: SubagentResult): Promise<SubagentResult>

  public abstract onEvent (ctx: OnMessageContext | OnCallBackQueryData, refundCallback: (reason?: string) => void): Promise<void>

  public abstract isSupportedEvent (ctx: OnMessageContext | OnCallBackQueryData): boolean

  public abstract isSupportedSubagent (ctx: OnMessageContext | OnCallBackQueryData): boolean

  public abstract getEstimatedPrice (ctx: any): number

  // public abstract getCompletion (ctx: OnMessageContext | OnCallBackQueryData, id: number, completion: string): string
  protected getSession (ctx: OnMessageContext | OnCallBackQueryData): SubagentSessionData {
    return (ctx.session[this.sessionDataKey as keyof BotSessionData] as SubagentSessionData)
  }

  public static deleteCompletion (ctx: OnMessageContext | OnCallBackQueryData, id: number): void {
    ctx.session.subagents.running = ctx.session.subagents.running.filter(agent => agent.id === id)
  }

  public static getAgents (ctx: OnMessageContext | OnCallBackQueryData, id: number): SubagentResult[] | undefined {
    return ctx.session.subagents.running.filter(agent => agent.id === id)
  }

  public async onCheckAgentStatus (ctx: OnMessageContext | OnCallBackQueryData): Promise<void> {
    const session = this.getSession(ctx)
    while (session.subagentsRequestQueue.length > 0) {
      try {
        const agent = session.subagentsRequestQueue.shift()
        if (agent) {
          const result = await this.checkStatus(ctx, agent)
          if (!result || result.status === SubagentStatus.PROCESSING) {
            session.subagentsRequestQueue.push(agent)
            await sleep(3000)
          } else {
            session.running.push(agent)
          }
        }
        ctx.transient.analytics.actualResponseTime = now()
      } catch (e: any) {
        await this.onError(ctx, e)
      }
    }
  }

  async onNotBalanceMessage (ctx: OnMessageContext | OnCallBackQueryData): Promise<string> {
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
    ctx.transient.analytics.actualResponseTime = now()
    return balanceMessage
  }

  async onError (
    ctx: OnMessageContext | OnCallBackQueryData,
    e: any,
    retryCount: number = this.errorHandler.maxTries,
    msg = ''
  ): Promise<void> {
    await this.errorHandler.onError(ctx, e, retryCount, this.logger, msg)
  }
}
