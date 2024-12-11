import * as Sentry from '@sentry/node'
import config from '../config'
import { ProfilingIntegration } from '@sentry/profiling-node'
import { getEnvironment } from './environments'

const env = getEnvironment()

// Configure sample rates based on environment
const sampleRates = {
  local: {
    traces: 1.0, // Higher sampling in local for testing
    profiles: 1.0
  },
  test: {
    traces: 0.5, // Medium sampling in test
    profiles: 1.0
  },
  production: {
    traces: 0.1, // Lower sampling in production for performance
    profiles: 1.0
  }
}

Sentry.init({
  dsn: config.sentry.dsn,
  release: config.commitHash,
  environment: env,
  integrations: [
    new ProfilingIntegration()
  ],
  tracesSampleRate: sampleRates[env].traces,
  profilesSampleRate: sampleRates[env].profiles
})

Sentry.setTags({ botName: config.botName })

export { Sentry }
