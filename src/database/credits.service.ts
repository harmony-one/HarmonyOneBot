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
      throw new Error(`${accountId} Cannot find credits account`)
    }
    if(bn(amount).lt(0)) {
      throw new Error(`${accountId} Amount cant be less than zero: ${amount}`)
    }
    const newAmount = bn(account.amount).minus(bn(amount))

    if(newAmount.lt(0)) {
      throw new Error(`${accountId} Insufficient credits: cannot withdraw ${amount}, current balance ${account.amount}`)
    }

    return creditsRepository.update({
      accountId
    }, {
      amount: newAmount.toFixed()
    })
  }

  // public async setAmount(accountId: string, amount: string) {
  //   const account = await this.getAccountById(accountId)
  //   if(!account) {
  //     throw new Error(`${accountId} Cannot find credits account`)
  //   }
  //   return creditsRepository.update({
  //     accountId
  //   }, {
  //     amount
  //   })
  // }

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
