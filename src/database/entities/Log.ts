import {Entity, Column, PrimaryGeneratedColumn, CreateDateColumn} from 'typeorm';

@Entity({ name: 'payment_log' })
export class PaymentLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({type: "bigint"})
  tgUserId: number;

  @Column({type: "bigint"})
  accountId: number;

  @Column()
  command: string;

  @Column()
  message: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, default: 0 })
  amountOne: number;

  @Column({ type: 'decimal', precision: 10, scale: 8, default: 0 })
  amountCredits: number;

  @CreateDateColumn()
  createdAt: Date;
}
