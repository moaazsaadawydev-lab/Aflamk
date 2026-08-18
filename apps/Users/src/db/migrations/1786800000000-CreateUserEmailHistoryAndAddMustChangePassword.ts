import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserEmailHistoryAndAddMustChangePassword1786800000000
  implements MigrationInterface
{
  name = 'CreateUserEmailHistoryAndAddMustChangePassword1786800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_email_history" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "previousEmail" character varying(255) NOT NULL,
        "newEmail" character varying(255) NOT NULL,
        "rollbackTokenHash" character varying(255) NOT NULL,
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "isReverted" boolean NOT NULL DEFAULT false,
        "revertedAt" TIMESTAMP WITH TIME ZONE NULL DEFAULT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_email_history_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_email_history_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_user_email_history_token_hash" ON "user_email_history" ("rollbackTokenHash")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_user_email_history_user_id" ON "user_email_history" ("userId")
    `);

    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mustChangePassword" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "mustChangePassword"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "user_email_history"
    `);
  }
}
