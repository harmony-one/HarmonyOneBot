import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm'

@Entity({ name: 'logs' })
export class BotLog {
  @PrimaryGeneratedColumn()
    id!: number

  @Column({ type: 'bigint' })
    tgUserId: number

  @Column({ type: 'bigint' })
    accountId: number

  @Column({ type: 'bigint' })
    groupId: number

  @Column({ default: false })
    isPrivate: boolean

  @Column()
    command: string

  @Column()
    message: string

  @Column({ default: false })
    isSupportedCommand: boolean

  @Column({ type: 'decimal', precision: 10, scale: 8, default: 0 })
    amountOne: number

  @Column({ type: 'decimal', precision: 10, scale: 8, default: 0 })
    amountCredits: number

  @Column({ type: 'decimal', precision: 10, scale: 8, default: 0 })
    amountFiatCredits: number

  @CreateDateColumn()
    createdAt: Date
}
