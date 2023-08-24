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

register.registerMetric(oneTokenFeeCounter)
register.registerMetric(freeCreditsFeeCounter)
register.registerMetric(uniqueUsersCounter)

export class PrometheusMetrics {
  public async bootstrap() {
    try {
      const totalOne = await statsService.getTotalONE()
      const freeCredits = await statsService.getTotalFreeCredits()
      const uniqueUsersCount = await statsService.getUniqueUsersCount()
      oneTokenFeeCounter.inc(totalOne)
      freeCreditsFeeCounter.inc(freeCredits)
      uniqueUsersCounter.inc(uniqueUsersCount)
      console.log(`Prometheus bootstrap: total ONE: ${totalOne}, freeCredits: ${freeCredits}, uniqueUsersCount: ${uniqueUsersCount}`)
    } catch (e) {
      console.log('Prometheus bootstrap error:', (e as Error).message)
    }
  }
}

export default register
