import * as Sentry from '@sentry/node'
import config from './config'
import { ProfilingIntegration } from '@sentry/profiling-node'

Sentry.init({
  dsn: config.sentry.dsn,
  release: config.commitHash,
  integrations: [
    new ProfilingIntegration()
  ],
  tracesSampleRate: 0.1, // Performance Monitoring. Should use 0.1 in production
  profilesSampleRate: 1.0 // Set sampling rate for profiling - this is relative to tracesSampleRate
})

Sentry.setTags({ botName: config.botName })

export { Sentry }
