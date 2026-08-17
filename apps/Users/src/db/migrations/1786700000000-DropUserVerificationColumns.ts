import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropUserVerificationColumns1786700000000
  implements MigrationInterface
{
  name = 'DropUserVerificationColumns1786700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "verificationCode"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "verificationCodeExpiresAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "passwordResetCode"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "passwordResetCodeExpiresAt"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "verificationCode" VARCHAR NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "verificationCodeExpiresAt" TIMESTAMP NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordResetCode" VARCHAR NULL DEFAULT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordResetCodeExpiresAt" TIMESTAMP NULL DEFAULT NULL`,
    );
  }
}
