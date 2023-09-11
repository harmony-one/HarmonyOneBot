import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateLogs1694429006773 implements MigrationInterface {
    name = 'UpdateLogs1694429006773'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "logs" ADD "amountFiatCredits" numeric(10,8) NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "logs" DROP COLUMN "amountFiatCredits"`);
    }

}
