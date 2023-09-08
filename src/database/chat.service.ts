import {AppDataSource} from "./datasource";
import bn from "bignumber.js";
import {User} from "./entities/User";
import {Chat} from "./entities/Chat";
import {ethers} from "ethers";
import {chatService} from "./services";
import config from "../config";
import { LRUCache } from 'lru-cache'

const chatRepository = AppDataSource.getRepository(Chat)
const userRepository = AppDataSource.getRepository(User)

const MAX_CHAT_COUNT: number = config.credits.maxChats;
const CREDITS_AMOUNT: string = config.credits.creditsAmount;

export class ChatService {
  creditsAssignedCache = new LRUCache<number, boolean>({
    max: 1000, ttl: 24 * 60 * 60 * 1000
  })

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

  public async isCreditsAssigned(accountId: number) {
    const cachedValue = this.creditsAssignedCache.get(accountId)
    if(cachedValue) {
      return true
    }
    const account = await this.getAccountById(accountId)
    if(account) {
      this.creditsAssignedCache.set(accountId, true)
    }
    return Boolean(account)
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

  public async withdrawFiatAmount(accountId: number, amount: string) {
    const chat = await this.getAccountById(accountId)
    if(!chat) {
      throw new Error(`${accountId} Cannot find fiat credits account`)
    }
    if(bn(amount).lt(0)) {
      throw new Error(`${accountId} Amount cant be less than zero: ${amount}`)
    }
    const newAmount = bn(chat.fiatCreditAmount).minus(bn(amount))

    if(newAmount.lt(0)) {
      throw new Error(`${accountId} Insufficient fiat credits: cannot withdraw ${amount}, current balance ${chat.fiatCreditAmount}`)
    }

    return chatRepository.update({
      accountId
    }, {
      fiatCreditAmount: newAmount.toFixed()
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

  public async depositFiatCredits(accountId: number, amount: string) {
    const account = await this.getAccountById(accountId)
    if(!account) {
      throw new Error(`${accountId} Cannot find credits account`)
    }

    const oldValue = BigInt(account.fiatCreditAmount);
    const newValue = oldValue + BigInt(amount);

    return chatRepository.update({
      accountId
    }, {
      fiatCreditAmount: newValue.toString()
    })
  }

  public async getBalance(accountId: number) {
    const account = await this.getAccountById(accountId)
    if(account) {
      return bn(account.creditAmount)
    }
    return bn(0)
  }

  public async getFiatBalance(accountId: number) {
    const account = await this.getAccountById(accountId)
    if(account) {
      return bn(account.fiatCreditAmount)
    }
    return bn(0)
  }

  public async initChat({tgUserId, accountId, tgUsername = ''}: {tgUserId: number, accountId: number, tgUsername?: string}) {
    const chat = await this.getAccountById(accountId);

    if (chat !== null) {
      return chat;
    }

    const chatCount = await chatService.getCountCreatedChats({tgUserId});

    const { maxChatsWhitelist } = config.credits
    const maxChatsCount = maxChatsWhitelist.includes(tgUsername) || maxChatsWhitelist.includes(tgUserId.toString())
      ? Infinity
      : MAX_CHAT_COUNT

    const amountInteger = chatCount > maxChatsCount ? '0' : CREDITS_AMOUNT;
    const creditAmount = ethers.utils.parseEther(amountInteger).toString();

    return this.create({tgUserId, accountId, creditAmount});
  }

  public async getCountCreatedChats({tgUserId}: {tgUserId: number}) {
    const chatList = await chatRepository.findBy({owner: {tgUserId}});
    return chatList.length
  }
}
