import {AppDataSource} from "./datasource";
import {StatBotCommand} from "./entities/StatBotCommand";
import moment from "moment/moment";

const statBotCommandRepository = AppDataSource.getRepository(StatBotCommand);

export class StatsService {
  public addCommandStat({tgUserId, rawMessage, command}: {tgUserId: number, rawMessage: string, command: string}) {
    const stat = new StatBotCommand();

    stat.command = command
    stat.rawMessage = rawMessage
    stat.tgUserId = tgUserId

    return statBotCommandRepository.save(stat);
  }

  public async getDAU() {
    const currentTime = moment(); // Get the current time
    const eightPm = moment().set({ hour: 20, minute: 0, second: 0 });
    let dateStart = moment().set({ hour: 20, minute: 0, second: 0 }).subtract(1, 'days').unix();

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