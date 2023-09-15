import { Entity, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity()
export class Invoice {
  @Column({ default: () => 'gen_random_uuid()', primary: true })
    uuid!: string

  @Column({ type: 'bigint' })
    tgUserId!: number

  @Column({ type: 'bigint' })
    accountId!: number

  @Column()
    currency!: string

  @Column()
    itemId!: string

  @Column()
    amount!: number

  @Column({ nullable: true })
    telegramPaymentChargeId!: string

  @Column({ nullable: true })
    providerPaymentChargeId!: string

  @Column({ nullable: false })
    status!: 'init' | 'pending' | 'fail' | 'success'

  @CreateDateColumn()
    createAt!: Date

  @UpdateDateColumn()
    updatedAt!: Date
}
