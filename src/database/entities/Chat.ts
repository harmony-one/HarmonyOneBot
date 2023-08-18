import {Entity, Column, PrimaryGeneratedColumn, ManyToOne} from 'typeorm';
import {User} from "./User";

@Entity({name: 'chats'})
export class Chat {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({type: 'bigint'})
  accountId!: number; // chatId or tgUserId

  @Column()
  creditAmount!: string;

  @ManyToOne(() => User, (user) => user.chat, {nullable: false})
  owner!: User // a user who invited the bot / group owner
}