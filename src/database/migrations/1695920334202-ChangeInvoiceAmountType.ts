import { MigrationInterface, QueryRunner } from "typeorm"

export class ChangeInvoiceAmountType1695920334202 implements MigrationInterface {
    name = 'ChangeInvoiceAmountType1695920334202'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "invoice" ALTER COLUMN "amount" TYPE varchar');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "invoice" ALTER COLUMN "amount" TYPE integer');
    }
}
