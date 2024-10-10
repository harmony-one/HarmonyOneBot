import { AppDataSource } from './datasource'
import { StatBotCommand } from './entities/StatBotCommand'
import moment from 'moment-timezone'
import { BotLog } from './entities/Log'
import pino from 'pino'
import { isValidDate } from '../modules/llms/utils/helpers'

const logger = pino({
  name: 'StatsService',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
})

const statBotCommandRepository = AppDataSource.getRepository(StatBotCommand)
const logRepository = AppDataSource.getRepository(BotLog)

export interface BotPaymentLog {
  tgUserId: number
  accountId: number
  groupId: number
  isPrivate: boolean
  command: string
  message: string
  isSupportedCommand: boolean
  amountOne: number
  amountCredits: number
  amountFiatCredits: number
}

export interface EngagementByCommand {
  command: string
  commandCount: string
  oneAmount: string
}

export class StatsService {
  public async writeLog (log: BotPaymentLog): Promise<BotLog> {
    let paymentLog = new BotLog()
    paymentLog = {
      ...paymentLog,
      ...log,
      message: (log.message || '').trim().slice(0, 1024)
    }
    return await logRepository.save(paymentLog)
  }

  async getTotalONE (): Promise<number> {
    try {
      const rows = await logRepository.query('select sum("amountOne") from logs')
      return rows.length ? +rows[0].sum : 0
    } catch (e) {
      logger.error(e)
      return 0
    }
  }

  async getTotalFreeCredits (): Promise<number> {
    try {
      const rows = await logRepository.query('select sum("amountCredits") from logs')
      return rows.length ? +rows[0].sum : 0
    } catch (e) {
      logger.error(e)
      return 0
    }
  }

  // added date for Amanda's monthly report => /allstats MM/DD/YYYY
  async getUniqueUsersCount (date?: Date): Promise<number> {
    let whereClause = ''
    const params: any[] = []
    try {
      if (date && isValidDate(date)) {
        whereClause = 'WHERE (EXTRACT(YEAR FROM "createdAt") = $1) AND (EXTRACT(MONTH FROM "createdAt") = $2)'
        const year = date.getFullYear().toString()
        const month = (date.getMonth() + 1).toString()
        params.push(year, month)
      }

      const query = `
        select count(distinct("tgUserId")) from logs
        ${whereClause}
      `
      const result = await logRepository.query(query, params)
      return result.length ? +result[0].count : 0
    } catch (e) {
      logger.error(e)
      return 0
    }
  }

  public async getActiveUsers (daysPeriod = 0): Promise<number> {
    try {
      const currentTime = moment()
      const dateStart = moment()
        .tz('America/Los_Angeles')
        .set({ hour: 0, minute: 0, second: 0 })
        .subtract(daysPeriod, 'days')
        .unix()
      const dateEnd = currentTime.unix()
      const rows = await logRepository
        .createQueryBuilder('logs')
        .select('count(distinct(logs."tgUserId"))')
        .where(`logs.createdAt BETWEEN TO_TIMESTAMP(${dateStart}) and TO_TIMESTAMP(${dateEnd})`)
        .execute()
      return rows.length ? +rows[0].count : 0
    } catch (e) {
      logger.error(e)
      return 0
    }
  }

  public async getNewUsers (daysPeriod = 0): Promise<number> {
    try {
      const currentTime = moment()
      const dateStart = moment()
        .tz('America/Los_Angeles')
        .set({ hour: 0, minute: 0, second: 0 })
        .subtract(daysPeriod, 'days')
        .unix()
      const dateEnd = currentTime.unix()
      const query = logRepository
        .createQueryBuilder('logs')
        .select('distinct("FirstInsertTime")')
        .from(subQuery =>
          subQuery
            .select('"tgUserId", MIN("createdAt") AS "FirstInsertTime"')
            .from(BotLog, 'logs')
            .groupBy('"tgUserId"'), 'first_inserts')
      if (daysPeriod > 0) {
        query.where(`"FirstInsertTime" BETWEEN TO_TIMESTAMP(${dateStart}) and TO_TIMESTAMP(${dateEnd})`)
      }
      const result = await query.execute()
      // console.log(dateStart, dateEnd, result.length)
      return result.length
    } catch (e) {
      logger.error(e)
      return 0
    }
  }

  // Doesn't check last 7 days.
  // added date for Amanda's monthly report => /allstats MM/DD/YYYY
  public async getOnetimeUsers (date?: Date): Promise<number> {
    try {
      const bufferDays = 7
      const bufferDate = moment()
        .tz('America/Los_Angeles')
        .set({ hour: 0, minute: 0, second: 0 })
        .subtract(bufferDays, 'days')
        .unix()
      const query = logRepository
        .createQueryBuilder('logs')
        .select('count("tgUserId") AS row_count, "tgUserId", MAX("createdAt") AS max_created')
        .where(`"createdAt" < TO_TIMESTAMP(${bufferDate})`)
      if (date && isValidDate(date)) {
        const year = date.getFullYear().toString()
        const month = (date.getMonth() + 1).toString()
        query.andWhere(`EXTRACT(YEAR FROM "createdAt") = ${year}`)
        query.andWhere(`EXTRACT(MONTH FROM "createdAt") = ${month}`)
      }
      query.groupBy('"tgUserId"')
      const result = await query.getRawMany()
      const filter = result.filter(row => row.row_count === '1')
      return filter.length
    } catch (e) {
      logger.error(e)
      return 0
    }
  }

  public async getTotalMessages (daysPeriod = 0, onlySupportedCommands = false): Promise<number> {
    try {
      const currentTime = moment()
      const dateStart = moment()
        .tz('America/Los_Angeles')
        .set({ hour: 0, minute: 0, second: 0 })
        .subtract(daysPeriod, 'days')
        .unix()

      const dateEnd = currentTime.unix()

      const query = logRepository
        .createQueryBuilder('logs')
        .select('count(*)')
      if (daysPeriod > 0) {
        query.where(`logs.createdAt BETWEEN TO_TIMESTAMP(${dateStart}) and TO_TIMESTAMP(${dateEnd})`)
      }
      if (onlySupportedCommands) {
        query.andWhere('logs.isSupportedCommand=true')
      }
      const rows = await query.execute()
      return rows.length ? +rows[0].count : 0
    } catch (e) {
      logger.error(e)
      return 0
    }
  }

  public async getUserEngagementByCommand (daysPeriod = 7): Promise<EngagementByCommand[]> {
    try {
      const currentTime = moment()
      const dateStart = moment()
        .tz('America/Los_Angeles')
        .set({ hour: 0, minute: 0, second: 0 })
        .subtract(daysPeriod, 'days')
        .unix()
      const dateEnd = currentTime.unix()
      const rows = await logRepository.createQueryBuilder('logs')
        .select('logs.command, count(logs.command) as "commandCount", SUM(logs.amountOne) as "oneAmount"')
        .where(`logs.createdAt BETWEEN TO_TIMESTAMP(${dateStart}) and TO_TIMESTAMP(${dateEnd})`)
        .groupBy('logs.command')
        .orderBy('"commandCount"', 'DESC').execute()
      return rows
    } catch (e) {
      logger.error(e)
      return []
    }
  }

  public async getRevenueFromLog (daysPeriod = 7): Promise<string> {
    try {
      const currentTime = moment()
      const dateStart = moment()
        .tz('America/Los_Angeles')
        .set({ hour: 0, minute: 0, second: 0 })
        .subtract(daysPeriod, 'days')
        .unix()
      const dateEnd = currentTime.unix()
      const result = await logRepository.createQueryBuilder('logs')
        .select('SUM(CAST(logs.amountCredits AS NUMERIC)) AS revenue')
        .where('logs.isSupportedCommand=true')
        .andWhere(`logs.createdAt BETWEEN TO_TIMESTAMP(${dateStart}) and TO_TIMESTAMP(${dateEnd})`)
        .execute()
      return result[0].revenue
    } catch (e) {
      logger.error(e)
      return ''
    }
  }

  public async addCommandStat ({ tgUserId, rawMessage, command }: { tgUserId: number, rawMessage: string, command: string }): Promise<StatBotCommand> {
    const stat = new StatBotCommand()

    stat.command = command
    stat.rawMessage = rawMessage
    stat.tgUserId = tgUserId

    return await statBotCommandRepository.save(stat)
  }

  public async getLastInteractingAccounts (hourPeriod: number): Promise<Array<{ accountId: string }>> {
    const dateStart = moment().subtract(hourPeriod, 'hour').unix()

    const queryBuilder = logRepository.createQueryBuilder('logs')
      .select('distinct(logs.accountId), logs.createdAt')
      .where(`logs.createdAt >= TO_TIMESTAMP(${dateStart})`)
      .orderBy('logs.createdAt', 'DESC')
      .limit(20)

    return await queryBuilder.execute()
  }

  public async getAllChatId (): Promise<number[]> {
    const queryBuilder = logRepository.createQueryBuilder('logs')
      .select('distinct("groupId")')
    return await queryBuilder.execute()
  }

  // to do port to queryBuilder
  // added date for Amanda's monthly report => /allstats MM/DD/YYYY
  public async getPaidUsers (date?: Date): Promise<{ users: number, freeCreditsBurned: number, amountCredits: number, amountOnes: number }> {
    let whereClause = ''
    const params: any[] = []

    if (date && isValidDate(date)) {
      whereClause = 'WHERE (EXTRACT(YEAR FROM "createdAt") = $1) AND (EXTRACT(MONTH FROM "createdAt") = $2)'
      const year = date.getFullYear().toString()
      const month = (date.getMonth() + 1).toString()
      params.push(year, month)
    }

    const query = `
      SELECT 
        COUNT(*) as user_count,
        COUNT(CASE WHEN total_credits > 100 THEN 1 END) as free_credits_burned,
        SUM(GREATEST(total_credits - 100, 0)) as total_paid_credits,
        SUM(total_ones) as total_ones_spent
      FROM (
        SELECT 
          "tgUserId",
          SUM("amountCredits") as total_credits,
          SUM("amountOne") as total_ones
        FROM logs
        ${whereClause}
        GROUP BY "tgUserId"
        HAVING SUM("amountCredits") > 100 OR SUM("amountOne") > 0
      ) as subquery
    `
    const result = await logRepository.query(query, params)
    return {
      users: result[0] ? parseInt(result[0].user_count) : 0,
      freeCreditsBurned: (result[0] && !date) ? parseInt(result[0].free_credits_burned) : 0,
      amountCredits: result[0] ? parseInt(result[0].total_paid_credits) : 0,
      amountOnes: result[0] ? parseInt(result[0].total_ones_spent) : 0
    }
  }

  // to do port to queryBuilder
  // added date for Amanda's monthly report => /allstats MM/DD/YYYY
  public async getFreeCreditUsers (date?: Date): Promise<{ users: number, amountFreeCredits: number, amountFreeCreditsRemaining: number }> {
    let whereClause = ''
    const params: any[] = []

    if (date && date instanceof Date && !isNaN(date.getTime())) {
      whereClause = 'WHERE (EXTRACT(YEAR FROM "createdAt") = $1) AND (EXTRACT(MONTH FROM "createdAt") = $2)'
      const year = date.getFullYear().toString()
      const month = (date.getMonth() + 1).toString()
      params.push(year, month)
    }

    const query = `
      SELECT 
          COUNT(*) as users_with_free_credits,
          SUM(total_credits) as total_free_credits_used,
          100 * COUNT(*) - SUM(total_credits) as remaining_free_credits
      FROM (
          SELECT 
              "tgUserId",
              SUM("amountCredits") as total_credits
          FROM logs
          ${whereClause}
          GROUP BY "tgUserId"
          HAVING SUM("amountCredits") > 0 AND SUM("amountCredits") <= 100 AND SUM("amountOne") = 0
      ) as subquery
    `

    const result = await logRepository.query(query, params)

    return {
      users: result[0] ? parseInt(result[0].users_with_free_credits) : 0,
      amountFreeCredits: result[0] ? parseInt(result[0].total_free_credits_used) : 0,
      amountFreeCreditsRemaining: result[0] && !date ? parseInt(result[0].remaining_free_credits) : 0
    }
  }
}
