import "reflect-metadata"
import { DataSource } from "typeorm"
import { Credits } from "./entities/Credits"
import config from "../config"

export const AppDataSource = new DataSource({
  type: "postgres",
  url: config.db.url,
  entities: [Credits],
  synchronize: true,
  migrations: ['./src/database/migrations/**/*.ts'],
  logging: false,
})
