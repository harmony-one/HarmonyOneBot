import { type MigrationInterface, type QueryRunner } from 'typeorm'

export class AddOneCreditAmount1694807031053 implements MigrationInterface {
  name = 'AddOneCreditAmount1694807031053'

  public async up (queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "chats" ADD "oneCreditAmount" character varying NOT NULL DEFAULT \'0\'')
  }

  public async down (queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "chats" DROP COLUMN "oneCreditAmount"')
  }
}
