import { type MigrationInterface, type QueryRunner } from 'typeorm'

export class CreateInvoice1694113262279 implements MigrationInterface {
  name = 'CreateInvoice1694113262279'

  public async up (queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE "invoice" ("uuid" character varying NOT NULL DEFAULT gen_random_uuid(), "tgUserId" bigint NOT NULL, "accountId" bigint NOT NULL, "currency" character varying NOT NULL, "itemId" character varying NOT NULL, "amount" integer NOT NULL, "telegramPaymentChargeId" character varying, "providerPaymentChargeId" character varying, "status" character varying NOT NULL, "createAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1b1d3a15ed53945d408170cecac" PRIMARY KEY ("uuid"))')
  }

  public async down (queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "invoice"')
  }
}
