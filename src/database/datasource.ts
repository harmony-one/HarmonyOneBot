import "reflect-metadata"
import { DataSource } from "typeorm"
import { Credits } from "./entities/Credits"
import config from "../config"

export const AppDataSource = new DataSource({
  type: "postgres",
  host: config.db.host,
  port: config.db.port,
  username: config.db.username,
  password: config.db.password,
  database: config.db.database,
  entities: [Credits],
  synchronize: false,
  migrations: ['./src/database/migrations/**/*.ts'],
  logging: true,
})