import {AppDataSource} from "./datasource";
import bn from "bignumber.js";
import {User} from "./entities/User";
import {Chat} from "./entities/Chat";

const chatRepository = AppDataSource.getRepository(Chat)
const userRepository = AppDataSource.getRepository(User)

export class ChatService {
  async create({tgUserId, accountId, creditAmount}: {tgUserId: number, accountId: number, creditAmount: string}) {
    let user = await userRepository.findOneBy({tgUserId: tgUserId});

    if (user === null) {
      user = new User();
      user.tgUserId = tgUserId;
      await userRepository.save(user);
    }

    const chat = new Chat();
    chat.accountId = accountId;
    chat.creditAmount = creditAmount;
    chat.owner = user;

    return chatRepository.save(chat);
  }

  public getAccountById(accountId: number) {
    return chatRepository.findOneBy({
      accountId
    })
  }

  public async withdrawAmount(accountId: number, amount: string) {
    const chat = await this.getAccountById(accountId)
    if(!chat) {
      throw new Error(`${accountId} Cannot find credits account`)
    }
    if(bn(amount).lt(0)) {
      throw new Error(`${accountId} Amount cant be less than zero: ${amount}`)
    }
    const newAmount = bn(chat.creditAmount).minus(bn(amount))

    if(newAmount.lt(0)) {
      throw new Error(`${accountId} Insufficient credits: cannot withdraw ${amount}, current balance ${chat.creditAmount}`)
    }

    return chatRepository.update({
      accountId
    }, {
      creditAmount: newAmount.toFixed()
    })
  }

  public async setAmount(accountId: number, amount: string) {
    const account = await this.getAccountById(accountId)
    if(!account) {
      throw new Error(`${accountId} Cannot find credits account`)
    }
    return chatRepository.update({
      accountId
    }, {
      creditAmount: amount
    })
  }

  public async getBalance(accountId: number) {
    const account = await this.getAccountById(accountId)
    if(account) {
      return bn(account.creditAmount)
    }
    return bn(0)
  }

  public async initAccount({tgUserId, accountId, creditAmount}: {tgUserId: number, accountId: number, creditAmount: string}) {
    const chat = await this.getAccountById(accountId);

    if (chat !== null) {
      return chat;
    }

    return this.create({tgUserId, accountId, creditAmount});
  }
}
