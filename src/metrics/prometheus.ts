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

register.registerMetric(oneTokenFeeCounter)
register.registerMetric(freeCreditsFeeCounter)

export class PrometheusMetrics {
  public async bootstrap() {
    try {
      const totalOne = await statsService.getTotalONE()
      const freeCredits = await statsService.getTotalFreeCredits()
      oneTokenFeeCounter.inc(totalOne)
      freeCreditsFeeCounter.inc(freeCredits)
      console.log(`Prometheus bootstrap: total ONE: ${totalOne}, freeCredits: ${freeCredits}`)
    } catch (e) {
      console.log('Prometheus bootstrap error:', (e as Error).message)
    }
  }
}

export default register
