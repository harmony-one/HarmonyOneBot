import {AppDataSource} from "./datasource";
import {Credits} from "./entities/Credits";
import bn from "bignumber.js";

const creditsRepository = AppDataSource.getRepository(Credits)

export class CreditsService {
  private async create(accountId: string, amount: string) {
    const credits = new Credits();
    credits.accountId = accountId;
    credits.amount = amount;

    return creditsRepository.save(credits);
  }

  public getAccountById(accountId: string) {
    return creditsRepository.findOneBy({
      accountId
    })
  }

  public async getBalance(accountId: string) {
    try {
      const account = await this.getAccountById(accountId)
      if(account) {
        return bn(account.amount)
      }
      return bn(0)
    } catch (e) {
      console.log(`Cannot get credits balance for account ${accountId}`, (e as Error).message)
      return bn(0)
    }
  }

  async initAccount(accountId: string, amount: string) {
    const credit = await this.getAccountById(accountId);

    if (credit !== null) {
      return credit;
    }

    return this.create(accountId, amount)
  }
}
