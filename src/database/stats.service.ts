import {AppDataSource} from "./datasource";
import {StatBotCommand} from "./entities/StatBotCommand";
import moment from "moment-timezone";
import {BotLog} from "./entities/Log";

const statBotCommandRepository = AppDataSource.getRepository(StatBotCommand);
const logRepository = AppDataSource.getRepository(BotLog);

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
}

export class StatsService {
  public writeLog(log: BotPaymentLog) {
    let paymentLog = new BotLog()
    paymentLog = {
      ...paymentLog,
      ...log,
      message: (log.message || '').trim().slice(0, 1024)
    }
    return logRepository.save(paymentLog);
  }

  private getDateTimestamp(dayPeriod: number) {
    return moment()
      .tz('America/Los_Angeles')
      .set({ hour: 0, minute: 0, second: 0 })
      .subtract(dayPeriod,'days')
      .unix()
  }

  async getONEAmount(dayPeriod?: number) {
    const query = logRepository
      .createQueryBuilder('logs')
      .select('sum(logs.amountOne) as amount')

    if(dayPeriod) {
      const dateFrom = this.getDateTimestamp(dayPeriod)
      query.where(`logs.createdAt >= TO_TIMESTAMP(${dateFrom})`)
    }

    const rows = await query.execute();
    return rows.length ? +rows[0].amount : 0
  }

  async getFreeCreditsAmount(dayPeriod?: number) {
    const query = logRepository
      .createQueryBuilder('logs')
      .select('sum(logs.amountCredits) as amount')

    if(dayPeriod) {
      const dateFrom = this.getDateTimestamp(dayPeriod)
      query.where(`logs.createdAt >= TO_TIMESTAMP(${dateFrom})`)
    }

    const rows = await query.execute();
    return rows.length ? +rows[0].amount : 0
  }

  async getUniqueUsersCount() {
    const rows = await logRepository.query(`select count(distinct("tgUserId")) from logs`)
    return rows.length ? +rows[0].count : 0
  }

  public async getActiveUsers(daysCount?: number) {
    const query = logRepository
      .createQueryBuilder('logs')
      .select('count(distinct(logs."tgUserId"))')

    if(daysCount) {
      const dateFrom = this.getDateTimestamp(daysCount)
      query.where(`logs.createdAt >= TO_TIMESTAMP(${dateFrom})`)
    }

    const rows = await query.execute();
    return rows.length ? +rows[0].count : 0
  }

  public async getTotalMessages(daysCount = 0, onlySupportedCommands = false) {
    const dateStart = this.getDateTimestamp(daysCount)
    const dateEnd = moment().unix();

    const query = await logRepository
      .createQueryBuilder('logs')
      .select('count(*)')
      .where(`logs.createdAt BETWEEN TO_TIMESTAMP(${dateStart}) and TO_TIMESTAMP(${dateEnd})`)

    if(onlySupportedCommands) {
      query.andWhere(`logs.isSupportedCommand=true`)
    }

    const rows = await query.execute()

    return rows.length ? +rows[0].count : 0
  }

  public addCommandStat({tgUserId, rawMessage, command}: {tgUserId: number, rawMessage: string, command: string}) {
    const stat = new StatBotCommand();

    stat.command = command
    stat.rawMessage = rawMessage
    stat.tgUserId = tgUserId

    return statBotCommandRepository.save(stat);
  }
}
