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

  public async withdrawAmount(accountId: string, amount: string) {
    const account = await this.getAccountById(accountId)
    if(!account) {
      throw new Error(`Cannot find credits account ${accountId}`)
    }
    const newAmount = bn(account.amount).minus(bn(amount))

    if(newAmount.lt(0)) {
      throw new Error(`Insufficient credits: cannot withdraw ${amount} for account ${accountId}, current balance ${account.amount}`)
    }

    return creditsRepository.update({
      accountId
    }, {
      amount: newAmount.toFixed()
    })
  }

  public async getBalance(accountId: string) {
    const account = await this.getAccountById(accountId)
    if(account) {
      return bn(account.amount)
    }
    return bn(0)
  }

  public async initAccount(accountId: string, amount: string) {
    const credit = await this.getAccountById(accountId);

    if (credit !== null) {
      return credit;
    }

    return this.create(accountId, amount)
  }
}
