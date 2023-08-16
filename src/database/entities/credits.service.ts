import {AppDataSource} from "../datasource";
import {Credits} from "./Credits";

const creditsRepository = AppDataSource.getRepository(Credits)

export class CreditsService {
  async get(accountId: string) {
    return creditsRepository.findOneBy({accountId})
  }

  async create(accountId: string, amount: string) {

    const credits = new Credits();
    credits.accountId = accountId;
    credits.amount = amount;

    return creditsRepository.save(credits);
  }

  async initAccount(accountId: string, amount: string) {
    const credit = await this.get(accountId);

    if (credit !== null) {
      return credit;
    }

    return this.create(accountId, amount)
  }
}