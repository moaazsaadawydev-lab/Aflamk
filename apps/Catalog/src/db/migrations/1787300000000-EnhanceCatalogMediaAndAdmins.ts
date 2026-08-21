import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnhanceCatalogMediaAndAdmins1787300000000
  implements MigrationInterface
{
  name = 'EnhanceCatalogMediaAndAdmins1787300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Cinema admins join table
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "cinema_admins" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "cinema_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone,
        CONSTRAINT "UQ_cinema_admins_cinema_user" UNIQUE ("cinema_id", "user_id"),
        CONSTRAINT "PK_cinema_admins_id" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_cinema_admins_cinema_id" ON "cinema_admins" ("cinema_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_cinema_admins_user_id" ON "cinema_admins" ("user_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "cinema_admins" DROP CONSTRAINT IF EXISTS "FK_cinema_admins_cinema_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cinema_admins" ADD CONSTRAINT "FK_cinema_admins_cinema_id" FOREIGN KEY ("cinema_id") REFERENCES "cinemas"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // 2. Cinema enhancements (media, description, soft delete, partial unique index)
    await queryRunner.query(
      `ALTER TABLE "cinemas" ADD COLUMN IF NOT EXISTS "description" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "cinemas" ADD COLUMN IF NOT EXISTS "thumbnail_url" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "cinemas" ADD COLUMN IF NOT EXISTS "gallery_urls" text array NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "cinemas" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "cinemas" DROP CONSTRAINT IF EXISTS "UQ_46e19545867352c4a24e6cf40e9"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_cinemas_slug_active" ON "cinemas" ("slug") WHERE deleted_at IS NULL`,
    );

    // 3. Movie enhancements (gallery, soft delete, partial unique index)
    await queryRunner.query(
      `ALTER TABLE "movies" ADD COLUMN IF NOT EXISTS "gallery_urls" text array NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "movies" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "movies" DROP CONSTRAINT IF EXISTS "UQ_6ed86498aefe0e545548ca31b78"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_movies_slug_active" ON "movies" ("slug") WHERE deleted_at IS NULL`,
    );

    // 4. Auditorium enhancements (soft delete, partial unique index)
    await queryRunner.query(
      `ALTER TABLE "auditoriums" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_auditoriums_cinema_name_active" ON "auditoriums" ("cinema_id", "name") WHERE deleted_at IS NULL`,
    );

    // 5. Showtime enhancements (soft delete)
    await queryRunner.query(
      `ALTER TABLE "showtimes" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "showtimes" DROP COLUMN IF EXISTS "deleted_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_auditoriums_cinema_name_active"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auditoriums" DROP COLUMN IF EXISTS "deleted_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_movies_slug_active"`,
    );
    await queryRunner.query(
      `ALTER TABLE "movies" ADD CONSTRAINT "UQ_6ed86498aefe0e545548ca31b78" UNIQUE ("slug")`,
    );
    await queryRunner.query(
      `ALTER TABLE "movies" DROP COLUMN IF EXISTS "deleted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "movies" DROP COLUMN IF EXISTS "gallery_urls"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_cinemas_slug_active"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cinemas" ADD CONSTRAINT "UQ_46e19545867352c4a24e6cf40e9" UNIQUE ("slug")`,
    );
    await queryRunner.query(
      `ALTER TABLE "cinemas" DROP COLUMN IF EXISTS "deleted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cinemas" DROP COLUMN IF EXISTS "gallery_urls"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cinemas" DROP COLUMN IF EXISTS "thumbnail_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cinemas" DROP COLUMN IF EXISTS "description"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cinema_admins" DROP CONSTRAINT IF EXISTS "FK_cinema_admins_cinema_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_cinema_admins_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_cinema_admins_cinema_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "cinema_admins"`);
  }
}
