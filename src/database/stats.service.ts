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
  amountCredits: number,
  amountFiatCredits: number
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

  async getTotalONE() {
    const rows = await logRepository.query(`select sum("amountOne") from logs`)
    return rows.length ? +rows[0].sum : 0
  }

  async getTotalFreeCredits() {
    const rows = await logRepository.query(`select sum("amountCredits") from logs`)
    return rows.length ? +rows[0].sum : 0
  }

  async getUniqueUsersCount() {
    const rows = await logRepository.query(`select count(distinct("tgUserId")) from logs`)
    return rows.length ? +rows[0].count : 0
  }

  public async getActiveUsers(daysPeriod = 0) {
    const currentTime = moment();
    const dateStart = moment()
      .tz('America/Los_Angeles')
      .set({ hour: 0, minute: 0, second: 0 })
      .subtract(daysPeriod,'days')
      .unix()

    const dateEnd = currentTime.unix();

    const rows = await logRepository
      .createQueryBuilder('logs')
      .select('count(distinct(logs."tgUserId"))')
      .where(`logs.createdAt BETWEEN TO_TIMESTAMP(${dateStart}) and TO_TIMESTAMP(${dateEnd})`)
      .execute();

    return rows.length ? +rows[0].count : 0
  }

  public async getTotalMessages(daysPeriod = 0, onlySupportedCommands = false) {
    const currentTime = moment();
    const dateStart = moment()
      .tz('America/Los_Angeles')
      .set({ hour: 0, minute: 0, second: 0 })
      .subtract(daysPeriod,'days')
      .unix()

    const dateEnd = currentTime.unix();

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
