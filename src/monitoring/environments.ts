import config from '../config'

export type Environment = 'local' | 'test' | 'production'

export function getEnvironment (): Environment {
  // Use SENTRY_ENVIRONMENT if available
  const sentryEnv = config.sentry.env.toLowerCase()
  if (sentryEnv) {
    // Validate that it's one of our expected environments
    if (['local', 'test', 'production'].includes(sentryEnv)) {
      return sentryEnv as Environment
    }
    // If invalid value, log warning and default to production
    console.warn(`Invalid SENTRY_ENVIRONMENT value: ${sentryEnv}. Defaulting to production`)
    return 'production'
  }
  // If no SENTRY_ENVIRONMENT set, assume local development
  return 'local'
}
