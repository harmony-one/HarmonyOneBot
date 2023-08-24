import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateBotStats1692691990832 implements MigrationInterface {
    name = 'CreateBotStats1692691990832'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "stat_bot_command" ("id" SERIAL NOT NULL, "tgUserId" bigint NOT NULL, "command" character varying NOT NULL, "rawMessage" character varying NOT NULL, "createDate" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6575c0ca0efe1b6d311e78fb3cd" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "stat_bot_command"`);
    }

}
