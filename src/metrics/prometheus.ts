import client from 'prom-client'
import {statsService} from "../database/services";


const register = new client.Registry()

register.setDefaultLabels({
  app: 'harmony-one-bot',
})

client.collectDefaultMetrics({register})

export const oneTokenFeeCounter = new client.Counter({
  name: 'fee_one',
  help: 'Fees earned by the bot in ONE tokens'
})

export const freeCreditsFeeCounter = new client.Counter({
  name: 'free_credits_fee',
  help: 'Free credits spent by users'
})

export const uniqueUsersCounter = new client.Counter({
  name: 'total_unique_users',
  help: 'Number of unique users'
})

export const dauCounter = new client.Counter({
  name: 'daily_active_users',
  help: 'Number of daily active users'
})

register.registerMetric(oneTokenFeeCounter)
register.registerMetric(freeCreditsFeeCounter)
register.registerMetric(uniqueUsersCounter)
register.registerMetric(dauCounter)

export class PrometheusMetrics {
  constructor() {
    const intervalId = setInterval(() => this.updateDau(), 30 * 60 * 1000)

    const clearIntervalUpdateDau = () => {
      clearInterval(intervalId);
    }

    process.once("SIGINT", clearIntervalUpdateDau);
    process.once("SIGTERM", clearIntervalUpdateDau);
  }

  public async bootstrap() {
    try {
      const totalOne = await statsService.getTotalONE()
      const freeCredits = await statsService.getTotalFreeCredits()
      const uniqueUsersCount = await statsService.getUniqueUsersCount()
      const dauValue = await statsService.getDAUFromLogs()
      oneTokenFeeCounter.inc(totalOne)
      freeCreditsFeeCounter.inc(freeCredits)
      uniqueUsersCounter.inc(uniqueUsersCount)
      dauCounter.inc(dauValue)
      console.log(`Prometheus bootstrap: total ONE: ${totalOne}, freeCredits: ${freeCredits}, uniqueUsersCount: ${uniqueUsersCount}, dau: ${dauValue}`)
    } catch (e) {
      console.log('Prometheus bootstrap error:', (e as Error).message)
    }
  }

  async updateDau() {
    try {
      const dauValue = await statsService.getDAUFromLogs()
      dauCounter.inc(dauValue)
    } catch (e) {
      console.log('Prometheus interval update error:', (e as Error).message)
    }
  }
}

export default register
