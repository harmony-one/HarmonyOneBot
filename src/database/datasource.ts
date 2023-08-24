import "reflect-metadata"
import { DataSource } from "typeorm"
import { Chat } from "./entities/Chat"
import { User } from "./entities/User";
import { StatBotCommand } from "./entities/StatBotCommand";
import config from "../config"
import {PaymentLog} from "./entities/Log";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: config.db.url,
  entities: [Chat, User, StatBotCommand, PaymentLog],
  synchronize: true,
  migrations: ['./src/database/migrations/**/*.{.ts,.js}'],
  logging: false,
})
