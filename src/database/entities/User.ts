import { Entity, Column, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import {Chat} from "./Chat";

@Entity({name: 'users'})
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({unique: true, type: "bigint"})
  tgUserId!: number;

  @OneToMany(() => Chat, (chat) => chat.owner, {nullable: false})
  chat!: Chat[]
}