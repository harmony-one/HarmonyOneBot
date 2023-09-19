import { AppDataSource } from './datasource'
import bn from 'bignumber.js'
import { User } from './entities/User'
import { Chat } from './entities/Chat'
import { ethers } from 'ethers'
import { chatService } from './services'
import config from '../config'
import { LRUCache } from 'lru-cache'
import { type UpdateResult } from 'typeorm'

const chatRepository = AppDataSource.getRepository(Chat)
const userRepository = AppDataSource.getRepository(User)

const MAX_CHAT_COUNT: number = config.credits.maxChats
const CREDITS_AMOUNT: string = config.credits.creditsAmount

export class ChatService {
  creditsAssignedCache = new LRUCache<number, boolean>({ max: 1000, ttl: 24 * 60 * 60 * 1000 })

  async create ({ tgUserId, accountId, creditAmount }: { tgUserId: number, accountId: number, creditAmount: string }): Promise<Chat> {
    let user = await userRepository.findOneBy({ tgUserId })

    if (user === null) {
      user = new User()
      user.tgUserId = tgUserId
      await userRepository.save(user)
    }

    const chat = new Chat()
    chat.accountId = accountId
    chat.creditAmount = creditAmount
    chat.owner = user

    return await chatRepository.save(chat)
  }

  public async getAccountById (accountId: number): Promise<Chat | null> {
    return await chatRepository.findOneBy({ accountId })
  }

  public async isCreditsAssigned (accountId: number): Promise<boolean> {
    const cachedValue = this.creditsAssignedCache.get(accountId)
    if (cachedValue) {
      return true
    }
    const account = await this.getAccountById(accountId)
    if (account) {
      this.creditsAssignedCache.set(accountId, true)
    }
    return Boolean(account)
  }

  public async setAmount (accountId: number, amount: string): Promise<UpdateResult> {
    const account = await this.getAccountById(accountId)
    if (!account) {
      throw new Error(`${accountId} Cannot find credits account`)
    }
    return await chatRepository.update({ accountId }, { creditAmount: amount })
  }

  public async depositFiatCredits (accountId: number, amount: string): Promise<UpdateResult> {
    const account = await this.getAccountById(accountId)
    if (!account) {
      throw new Error(`${accountId} Cannot find credits account`)
    }

    const oldValue = BigInt(account.fiatCreditAmount)
    const newValue = oldValue + BigInt(amount)

    return await chatRepository.update({ accountId }, { fiatCreditAmount: newValue.toString() })
  }

  public async depositOneCredits (accountId: number, amount: string) {
    const account = await this.getAccountById(accountId)
    if (!account) {
      throw new Error(`${accountId} Cannot find credits account`)
    }

    const oldValue = BigInt(account.oneCreditAmount)
    const newValue = oldValue + BigInt(amount)

    return await chatRepository.update({ accountId }, { oneCreditAmount: newValue.toString() })
  }

  public async getUserCredits (
    accountId: number
  ): Promise<{
    creditAmount: bn,
    fiatCreditAmount: bn,
    oneCreditAmount: bn,
    totalCreditsAmount: bn
  }> {
    const account = await this.getAccountById(accountId)

    const creditAmount = account ? bn(account.creditAmount) : bn(0)
    const fiatCreditAmount = account ? bn(account.fiatCreditAmount) : bn(0)
    const oneCreditAmount = account ? bn(account.oneCreditAmount) : bn(0)
    const totalCreditsAmount = creditAmount
      .plus(fiatCreditAmount)
      .plus(oneCreditAmount)

    return {
      creditAmount,
      fiatCreditAmount,
      oneCreditAmount,
      totalCreditsAmount
    }
  }

  public async withdrawCredits(accountId: number, payAmount: bn) {
    const {
      totalCreditsAmount,
      creditAmount,
      oneCreditAmount,
      fiatCreditAmount
    } = await this.getUserCredits(accountId)

    if(payAmount.gt(totalCreditsAmount)) {
      throw new Error(`Cannot withdraw credits, insufficient balance ${accountId}. On balance: ${totalCreditsAmount.toString()}, requested to withdraw: ${payAmount.toString()}.`)
    }

    let leftToPay = payAmount
    const creditsPayAmount = bn.min(leftToPay, creditAmount)
    const creditsAmountNext = creditAmount.minus(creditsPayAmount)
    leftToPay = leftToPay.minus(creditsPayAmount)

    const oneCreditsPay = bn.min(leftToPay, oneCreditAmount)
    const oneCreditsNext = oneCreditAmount.minus(oneCreditsPay)
    leftToPay = leftToPay.minus(oneCreditsPay)

    const fiatCreditPay = bn.min(leftToPay, fiatCreditAmount)
    const fiatCreditNext = fiatCreditAmount.minus(fiatCreditPay)
    leftToPay = leftToPay.minus(oneCreditsPay)

    await chatRepository.update({ accountId }, {
      creditAmount: creditsAmountNext.toFixed(),
      oneCreditAmount: oneCreditsNext.toFixed(),
      fiatCreditAmount: fiatCreditNext.toFixed()
    })
    return await this.getUserCredits(accountId)
  }

  public async initChat ({ tgUserId, accountId, tgUsername = '' }: { tgUserId: number, accountId: number, tgUsername?: string }): Promise<Chat> {
    const chat = await this.getAccountById(accountId)

    if (chat !== null) {
      return chat
    }

    const chatCount = await chatService.getCountCreatedChats({ tgUserId })

    const { maxChatsWhitelist } = config.credits
    const maxChatsCount = maxChatsWhitelist.includes(tgUsername) || maxChatsWhitelist.includes(tgUserId.toString())
      ? Infinity
      : MAX_CHAT_COUNT

    const amountInteger = chatCount > maxChatsCount ? '0' : CREDITS_AMOUNT
    const creditAmount = ethers.utils.parseEther(amountInteger).toString()

    return await this.create({ tgUserId, accountId, creditAmount })
  }

  public async getCountCreatedChats ({ tgUserId }: { tgUserId: number }): Promise<number> {
    const chatList = await chatRepository.findBy({ owner: { tgUserId } })
    return chatList.length
  }
}
