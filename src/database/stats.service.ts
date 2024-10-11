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

  // added date for Amanda's monthly report => /allstats MM/DD/YYYY
  public async getNewUsers (daysPeriod = 0, date?: Date): Promise<number> {
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
        .select('distinct("first_insert_time")')
        .from(subQuery =>
          subQuery
            .select('"tgUserId", MIN("createdAt") AS "first_insert_time"')
            .from(BotLog, 'logs')
            .groupBy('"tgUserId"'), 'first_inserts')
      if (date && isValidDate(date)) {
        query.where('EXTRACT(YEAR FROM first_insert_time) = :year', { year: date.getFullYear() })
          .andWhere('EXTRACT(MONTH FROM first_insert_time) = :month', { month: date.getMonth() + 1 })
      } else if (daysPeriod > 0) {
        query.where('first_insert_time BETWEEN  TO_TIMESTAMP(:start) AND  TO_TIMESTAMP(:end)', { start: dateStart, end: dateEnd })
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
  // Paid User = A user who has spent more than 100 credits (first 100 are free).
  // added date for Amanda's monthly report => /allstats MM/DD/YYYY
  public async getPaidUsers (date?: Date): Promise<{ users: number, freeCreditsBurned: number, amountCredits: number, amountOnes: number }> {
    let yearCondition = ''
    let monthCondition = ''
    let params: any[] = []

    if (date && date instanceof Date) {
      const year = date.getFullYear()
      const month = date.getMonth() + 1 // JavaScript months are 0-indexed
      yearCondition = 'AND EXTRACT(YEAR FROM l."createdAt") = $1'
      monthCondition = 'AND EXTRACT(MONTH FROM l."createdAt") = $2'
      params = [year, month]
    }

    const query = `
      WITH paid_users AS (
          SELECT "tgUserId"
          FROM logs
          ${date ? 'WHERE "createdAt" <= $3' : ''}
          GROUP BY "tgUserId"
          HAVING SUM("amountCredits") > 100
      ),
      spending AS (
          SELECT 
              l."tgUserId",
              SUM(l."amountCredits") as credits
          FROM logs l
          JOIN paid_users pu ON l."tgUserId" = pu."tgUserId"
          WHERE 1=1 ${yearCondition} ${monthCondition}
          GROUP BY l."tgUserId"
          HAVING SUM(l."amountCredits") > 0
      )
      SELECT 
          COUNT(*) as user_count,
          SUM(GREATEST(credits - 100, 0)) as credits_burned,
          SUM(credits) as total_credits
      FROM spending
    `
    if (date) {
      params.push(date.toISOString())
    }
    const result = await logRepository.query(query, params)
    return {
      users: parseInt(result[0]?.user_count) || 0,
      freeCreditsBurned: !date ? parseFloat(result[0]?.total_credits) - parseFloat(result[0]?.credits_burned) || 0 : 0,
      amountCredits: parseFloat(result[0]?.total_credits) || 0,
      amountOnes: 0 // TODO: implement this
    }
  }

  // to do port to queryBuilder
  // added date for Amanda's monthly report => /allstats MM/DD/YYYY
  public async getFreeCreditUsers (date?: Date): Promise<{ users: number, amountFreeCredits: number, amountFreeCreditsRemaining: number }> {
    let yearCondition = ''
    let monthCondition = ''
    let params: any[] = []

    if (date && date instanceof Date) {
      const year = date.getFullYear()
      const month = date.getMonth() + 1 // JavaScript months are 0-indexed
      yearCondition = 'AND EXTRACT(YEAR FROM l."createdAt") = $1'
      monthCondition = 'AND EXTRACT(MONTH FROM l."createdAt") = $2'
      // get the date with the last day of the month
      const lastDayOfMonth = new Date(year, month, 0).getDate()
      const endOfMonthDate = new Date(year, month - 1, lastDayOfMonth, 23, 59, 59, 999)
      params = [year, month, endOfMonthDate.toISOString()]
    }

    const query = `
      WITH paid_users AS (
          SELECT "tgUserId"
          FROM logs
          ${date ? 'WHERE "createdAt" <= $3' : ''}
          GROUP BY "tgUserId"
          HAVING SUM("amountCredits") > 0 AND SUM("amountCredits") <= 100
      ),
      spending AS (
          SELECT 
              l."tgUserId",
              SUM(l."amountCredits") as credits
          FROM logs l
          JOIN paid_users pu ON l."tgUserId" = pu."tgUserId"
          WHERE 1=1 ${yearCondition} ${monthCondition}
          GROUP BY l."tgUserId"
          HAVING SUM(l."amountCredits") > 0
      )
      SELECT 
          COUNT(*) as users_with_free_credits,
          SUM(credits) as total_free_credits_used,
          100 * COUNT(*) - SUM(credits) as remaining_free_credits
      FROM spending
    `
    const result = await logRepository.query(query, params)
    return {
      users: result[0] ? parseInt(result[0].users_with_free_credits) : 0,
      amountFreeCredits: result[0] ? parseInt(result[0].total_free_credits_used) : 0,
      amountFreeCreditsRemaining: result[0] && !date ? parseInt(result[0].remaining_free_credits) : 0
    }
  }
}
