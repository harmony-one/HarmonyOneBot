import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateChatAndUser1692288389518 implements MigrationInterface {
    name = 'CreateChatAndUser1692288389518'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "users" ("id" SERIAL NOT NULL, "tgUserId" bigint NOT NULL, CONSTRAINT "UQ_787ccd2ee369ea82b4417967e40" UNIQUE ("tgUserId"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "chats" ("id" SERIAL NOT NULL, "accountId" bigint NOT NULL, "creditAmount" character varying NOT NULL, "ownerId" integer NOT NULL, CONSTRAINT "PK_0117647b3c4a4e5ff198aeb6206" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "chats" ADD CONSTRAINT "FK_40d195fcbaada4020f429df8b48" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chats" DROP CONSTRAINT "FK_40d195fcbaada4020f429df8b48"`);
        await queryRunner.query(`DROP TABLE "chats"`);
        await queryRunner.query(`DROP TABLE "users"`);
    }

}
