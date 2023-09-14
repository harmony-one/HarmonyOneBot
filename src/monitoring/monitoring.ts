import cron, { type ScheduledTask } from 'node-cron'
import axios from 'axios'
import { type RunnerHandle } from '@grammyjs/runner'
import { pino } from 'pino'

const logger = pino({
  name: 'monitoring',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
})

export const runBotHeartBit = async (runner: RunnerHandle, heartBitId: string): Promise<ScheduledTask> => {
  const action = (): void => {
    logger.info('heartbit')
    if (!runner.isRunning()) {
      logger.error('bot runner is stopped')
      return
    }

    axios
      .post(
        `https://uptime.betterstack.com/api/v1/heartbeat/${heartBitId}`
      ).catch((err) => {
        logger.warn(`betteruptime error ${err}`)
      })
  }

  return cron.schedule('*/1 * * * *', action)
}
