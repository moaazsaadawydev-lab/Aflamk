import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSessionsTableAndDropRefreshToken1786480000000
  implements MigrationInterface
{
  name = 'AddSessionsTableAndDropRefreshToken1786480000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "refreshTokenHash" character varying(255) NOT NULL,
        "userAgent" character varying(500),
        "ipAddress" character varying(100),
        "expiresAt" TIMESTAMP NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        "lastUsedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        CONSTRAINT "PK_3238ef96f18b355b671619111bc" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_session_user_id" ON "sessions" ("userId")`,
    );

    await queryRunner.query(
      `ALTER TABLE "sessions" ADD CONSTRAINT "FK_session_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "refreshToken"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "refreshToken" character varying(255)`,
    );

    await queryRunner.query(
      `ALTER TABLE "sessions" DROP CONSTRAINT "FK_session_user"`,
    );

    await queryRunner.query(
      `DROP INDEX "IDX_session_user_id"`,
    );

    await queryRunner.query(
      `DROP TABLE "sessions"`,
    );
  }
}
