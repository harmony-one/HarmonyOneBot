import pino, {Logger} from "pino";
import Web3, {Web3BaseWalletAccount} from 'web3'
import axios from 'axios'
import bn, {BigNumber} from 'bignumber.js'
import config from "../../config";

interface CoinGeckoResponse {
  harmony: {
    usd: string
  }
}

export class BotPayments {
  private logger: Logger;
  private web3: Web3;
  private ONERate: number = 0
  private rpcURL = 'https://api.harmony.one'

  constructor() {
    this.web3 = new Web3(this.rpcURL)

    this.logger = pino({
      name: 'Payments',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true
        }
      }
    })

    this.pollPrice()
  }

  private async pollPrice() {
    try {
      this.ONERate = await this.getONEPrice()
    } catch (e) {
      this.logger.error(`Cannot get token price: ${JSON.stringify(e)}`)
    } finally {
      await new Promise(resolve => setTimeout(resolve,  1000 * 60))
      this.pollPrice()
    }
  }

  private async getONEPrice(tokenId = 'harmony') {
    const { data } = await axios.get<CoinGeckoResponse>(
      `https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd`
    )
    return +data.harmony.usd
  }

  private getUserAccount(userId: number) {
    const privateKey = this.web3.utils.sha3(`${config.payment.secret}_${userId}`);
    if(privateKey) {
      return this.web3.eth.accounts.privateKeyToAccount(privateKey);
    }
  }

  public convertUSDCentsToOne(usdAmount: number) {
    const amount = this.ONERate ? Math.round(usdAmount / 100 / this.ONERate) : 0
    return bn(amount).multipliedBy(10 ** 18)
  }

  public convertONE (amountOne: BigNumber) {
    return this.web3.utils.toDecimal(amountOne.toString())
  }

  public async getAddressBalance(address: string) {
    const balance = await this.web3.eth.getBalance(address);
    return bn(balance.toString())
  }

  public async isEnoughBalance (userId: number, amountUSD: number) {
    const amountOne = this.convertUSDCentsToOne(amountUSD)
    const account = this.getUserAccount(userId)
    if(account) {
      const userBalance = await this.getAddressBalance(account.address)
      return userBalance.gt(amountOne)
    }
    return false
  }

  private async transferONE(account: Web3BaseWalletAccount, receiverAddress: string, amountOne: string) {
    const web3 = new Web3(this.rpcURL)
    web3.eth.accounts.wallet.add(account)

    const gasPrice = await web3.eth.getGasPrice()

    const res = await web3.eth.sendTransaction({
      from: account.address,
      to: receiverAddress,
      value: amountOne,
      gasPrice,
      gas: web3.utils.toHex(21000),
    })
    return res
  }

  public async withdraw(userId: number, amountUSD: number) {
    const { serviceAddress } = config.payment
    const amountOne = this.convertUSDCentsToOne(amountUSD)
    const account = this.getUserAccount(userId)

    if(account) {
      const tx = await this.transferONE(account, serviceAddress, amountOne.toString())
      return tx
    } else {
      throw new Error('Cannot withdraw: missing blockchain account')
    }
  }
}
