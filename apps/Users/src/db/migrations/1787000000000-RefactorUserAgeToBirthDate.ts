import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorUserAgeToBirthDate1787000000000
  implements MigrationInterface
{
  name = 'RefactorUserAgeToBirthDate1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "age";
    `);
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "birthDate" date NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "birthDate";
    `);
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "age" integer NOT NULL DEFAULT 18;
    `);
  }
}
