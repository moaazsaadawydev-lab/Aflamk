import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordChangedAtToUsers1786500000000
  implements MigrationInterface
{
  name = 'AddPasswordChangedAtToUsers1786500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordChangedAt" TIMESTAMP NULL DEFAULT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "passwordChangedAt"`,
    );
  }
}
