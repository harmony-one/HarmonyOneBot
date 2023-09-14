import { type MigrationInterface, type QueryRunner } from 'typeorm'

export class CreateFiatCredits1694192294713 implements MigrationInterface {
  name = 'CreateFiatCredits1694192294713'

  public async up (queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "chats" ADD "fiatCreditAmount" character varying NOT NULL DEFAULT \'0\'')
  }

  public async down (queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "chats" DROP COLUMN "fiatCreditAmount"')
  }
}
