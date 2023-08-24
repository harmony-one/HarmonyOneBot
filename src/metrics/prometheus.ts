import client from 'prom-client'

const register = new client.Registry()

register.setDefaultLabels({
  app: 'harmony-one-bot',
})

client.collectDefaultMetrics({register})


export const usdFeeCounter = new client.Counter({
  name: 'fee_usd',
  help: 'fee_help'
})
export const oneTokenFeeCounter = new client.Counter({
  name: 'fee_one',
  help: 'fee_help'
})

export const creditsFeeCounter = new client.Counter({
  name: 'free_credits_fee',
  help: 'free_credits_fee_help'
})

register.registerMetric(usdFeeCounter)
register.registerMetric(oneTokenFeeCounter)
register.registerMetric(creditsFeeCounter)

export default register
