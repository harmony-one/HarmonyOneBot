import {AppDataSource} from "./datasource";
import {StatBotCommand} from "./entities/StatBotCommand";
import moment from "moment/moment";
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

  async getTotalONE() {
    const [result] = await logRepository.query(`select sum("amountOne") from logs`)
    if(result) {
      return +result.sum
    }
    return 0
  }

  async getTotalFreeCredits() {
    const [result] = await logRepository.query(`select sum("amountCredits") from logs`)
    if(result) {
      return +result.sum
    }
    return 0
  }

  async getUniqueUsersCount() {
    const [result] = await logRepository.query(`select count(distinct("tgUserId")) from logs`)
    if(result) {
      return +result.count
    }
    return 0
  }

  public addCommandStat({tgUserId, rawMessage, command}: {tgUserId: number, rawMessage: string, command: string}) {
    const stat = new StatBotCommand();

    stat.command = command
    stat.rawMessage = rawMessage
    stat.tgUserId = tgUserId

    return statBotCommandRepository.save(stat);
  }

  public async getDAU() {
    const currentTime = moment();
    const eightPm = moment().set({ hour: 20, minute: 0, second: 0 });
    let dateStart = moment()
      .set({ hour: 20, minute: 0, second: 0 })
      .subtract(1, 'days')
      .unix();

    if (currentTime.isAfter(eightPm)) {
      dateStart = eightPm.unix();
    }

    const dateEnd = currentTime.unix();

    const rows = await statBotCommandRepository
      .createQueryBuilder('uda')
      .select('uda.tgUserId')
      .where(`uda.createDate BETWEEN TO_TIMESTAMP(${dateStart}) and TO_TIMESTAMP(${dateEnd})`)
      .groupBy('uda.tgUserId')
      .execute();

    return rows.length;
  }

  public async getMAU() {
    const dateStart = moment().subtract(30, 'days').unix();
    const dateEnd = moment().unix();

    const rows = await statBotCommandRepository
      .createQueryBuilder('uda')
      .select('uda.tgUserId')
      .groupBy('uda.tgUserId')
      .where(`uda.createDate BETWEEN TO_TIMESTAMP(${dateStart}) and TO_TIMESTAMP(${dateEnd})`).execute();

    return rows.length;
  }
}
