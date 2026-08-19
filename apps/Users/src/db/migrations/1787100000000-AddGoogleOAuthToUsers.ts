import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGoogleOAuthToUsers1787100000000 implements MigrationInterface {
  name = 'AddGoogleOAuthToUsers1787100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create users_provider_enum
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "users_provider_enum" AS ENUM('LOCAL', 'GOOGLE');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Make password, gender, and country nullable for social logins
    await queryRunner.query(`
      ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE "users" ALTER COLUMN "gender" DROP NOT NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE "users" ALTER COLUMN "country" DROP NOT NULL;
    `);

    // 3. Add avatarUrl, googleId, and provider columns
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatarUrl" character varying(500) NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "googleId" character varying(255) NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "provider" "users_provider_enum" NOT NULL DEFAULT 'LOCAL';
    `);

    // 4. Create unique index on googleId
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_users_googleId" ON "users" ("googleId") WHERE "googleId" IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_users_googleId";
    `);
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "provider";
    `);
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "googleId";
    `);
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "avatarUrl";
    `);
    await queryRunner.query(`
      DROP TYPE IF EXISTS "users_provider_enum";
    `);
  }
}
