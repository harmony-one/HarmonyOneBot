import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLogs1692905335026 implements MigrationInterface {
    name = 'AddLogs1692905335026'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "logs" ("id" SERIAL NOT NULL, "tgUserId" bigint NOT NULL, "accountId" bigint NOT NULL, "groupId" bigint NOT NULL, "isPrivate" boolean NOT NULL DEFAULT false, "command" character varying NOT NULL, "message" character varying NOT NULL, "isSupportedCommand" boolean NOT NULL DEFAULT false, "amountOne" numeric(10,8) NOT NULL DEFAULT '0', "amountCredits" numeric(10,8) NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_fb1b805f2f7795de79fa69340ba" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "logs"`);
    }

}
