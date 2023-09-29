import { type MigrationInterface, type QueryRunner } from 'typeorm'

export class CreateCredits1692196823526 implements MigrationInterface {
  name = 'CreateCredits1692196823526'

  public async up (queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE "credits" ("id" SERIAL NOT NULL, "accountId" character varying NOT NULL, "amount" character varying NOT NULL, CONSTRAINT "PK_45cea097fd0ee625d2e840ed99c" PRIMARY KEY ("id"))')
  }

  public async down (queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "credits"')
  }
}
