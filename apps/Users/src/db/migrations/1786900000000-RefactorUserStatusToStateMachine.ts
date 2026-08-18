import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorUserStatusToStateMachine1786900000000
  implements MigrationInterface
{
  name = 'RefactorUserStatusToStateMachine1786900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create user_status_enum
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "users_status_enum" AS ENUM('UNVERIFIED', 'ACTIVE', 'SUSPENDED', 'BLOCKED', 'DELETED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Add status columns to users
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" "users_status_enum" NOT NULL DEFAULT 'UNVERIFIED';
    `);

    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "statusReason" character varying(500) NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "suspendedUntil" TIMESTAMP WITH TIME ZONE NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "statusChangedAt" TIMESTAMP WITH TIME ZONE NULL;
    `);

    // 3. Create index on status
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_status" ON "users" ("status");
    `);

    // 4. Data Migration
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'isVerified') THEN
          UPDATE "users" SET "status" = 'ACTIVE' WHERE "isVerified" = true;
          UPDATE "users" SET "status" = 'UNVERIFIED' WHERE "isVerified" = false;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_verified') THEN
          UPDATE "users" SET "status" = 'ACTIVE' WHERE "is_verified" = true;
          UPDATE "users" SET "status" = 'UNVERIFIED' WHERE "is_verified" = false;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'isBlocked') THEN
          UPDATE "users" SET "status" = 'BLOCKED' WHERE "isBlocked" = true;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_blocked') THEN
          UPDATE "users" SET "status" = 'BLOCKED' WHERE "is_blocked" = true;
        END IF;
      END $$;
    `);

    // 5. Drop obsolete columns
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "isVerified";
    `);
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "is_verified";
    `);
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "isBlocked";
    `);
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "is_blocked";
    `);
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "lastBlockedAt";
    `);
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "last_blocked_at";
    `);
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "blockReason";
    `);
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "block_reason";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isVerified" boolean DEFAULT false;
    `);
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isBlocked" boolean DEFAULT false;
    `);
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastBlockedAt" timestamp NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "blockReason" character varying(255) NULL;
    `);

    await queryRunner.query(`
      UPDATE "users" SET "isVerified" = true WHERE "status" = 'ACTIVE';
    `);
    await queryRunner.query(`
      UPDATE "users" SET "isBlocked" = true WHERE "status" = 'BLOCKED';
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_users_status";
    `);

    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "statusChangedAt";
    `);
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "suspendedUntil";
    `);
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "statusReason";
    `);
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "status";
    `);
    await queryRunner.query(`
      DROP TYPE IF EXISTS "users_status_enum";
    `);
  }
}
