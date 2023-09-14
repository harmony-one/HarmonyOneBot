import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { Chat } from './entities/Chat'
import { User } from './entities/User'
import { StatBotCommand } from './entities/StatBotCommand'
import config from '../config'
import { BotLog } from './entities/Log'
import { Invoice } from './entities/Invoice'

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: config.db.url,
  entities: [Chat, User, StatBotCommand, BotLog, Invoice],
  migrations: ['./src/database/migrations/**/*.{.ts,.js}'],
  // The ".ts" extension does not work with the built application.
  // migrations: ['./src/database/migrations/**/*.ts'],
  logging: false
})
