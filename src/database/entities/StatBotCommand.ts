import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm'

@Entity()
export class StatBotCommand {
  @PrimaryGeneratedColumn()
    id!: number

  @Column({ type: 'bigint' })
    tgUserId!: number

  @Column()
    command!: string

  @Column()
    rawMessage!: string

  @CreateDateColumn()
    createDate!: Date
}
