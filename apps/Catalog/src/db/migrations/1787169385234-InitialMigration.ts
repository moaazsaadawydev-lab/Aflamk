import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1787169385234 implements MigrationInterface {
    name = 'InitialMigration1787169385234'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."outbox_messages_status_enum" AS ENUM('PENDING', 'PUBLISHED', 'FAILED')`);
        await queryRunner.query(`CREATE TABLE "outbox_messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "eventType" character varying NOT NULL, "payload" jsonb NOT NULL, "status" "public"."outbox_messages_status_enum" NOT NULL DEFAULT 'PENDING', "retryCount" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "publishedAt" TIMESTAMP, CONSTRAINT "PK_0171348f527c64b137e4d4f5b66" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "genres" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(50) NOT NULL, "slug" character varying(60) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updated_at" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, CONSTRAINT "UQ_f105f8230a83b86a346427de94d" UNIQUE ("name"), CONSTRAINT "UQ_d1cbe4fe39bdfc77c76e94eada5" UNIQUE ("slug"), CONSTRAINT "PK_80ecd718f0f00dde5d77a9be842" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."movies_age_rating_enum" AS ENUM('G', 'PG', 'PG_13', 'R', 'NC_17')`);
        await queryRunner.query(`CREATE TYPE "public"."movies_status_enum" AS ENUM('COMING_SOON', 'NOW_SHOWING', 'ARCHIVED')`);
        await queryRunner.query(`CREATE TABLE "movies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(255) NOT NULL, "slug" character varying(255) NOT NULL, "description" text NOT NULL, "duration_minutes" integer NOT NULL, "release_date" date NOT NULL, "age_rating" "public"."movies_age_rating_enum" NOT NULL, "status" "public"."movies_status_enum" NOT NULL DEFAULT 'COMING_SOON', "original_language" character varying(10) NOT NULL, "spoken_languages" text array, "subtitles" text array, "poster_url" character varying(500), "banner_url" character varying(500), "trailer_url" character varying(500), "directors" text array NOT NULL DEFAULT '{}', "cast" text array NOT NULL DEFAULT '{}', "rating_average" numeric(3,2) NOT NULL DEFAULT '0', "rating_count" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updated_at" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, CONSTRAINT "UQ_6ed86498aefe0e545548ca31b78" UNIQUE ("slug"), CONSTRAINT "PK_c5b2c134e871bfd1c2fe7cc3705" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_5aa0bbd146c0082d3fc5a0ad5d" ON "movies"  ("title") `);
        await queryRunner.query(`CREATE TABLE "cinemas" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(150) NOT NULL, "slug" character varying(160) NOT NULL, "city" character varying(100) NOT NULL, "address" text NOT NULL, "latitude" numeric(10,8), "longitude" numeric(11,8), "phone_number" character varying(20), "facilities" text array, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updated_at" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, CONSTRAINT "UQ_46e19545867352c4a24e6cf40e9" UNIQUE ("slug"), CONSTRAINT "PK_5c49a5f87710ce93fad49d72320" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_7d5e149eb3058d887cbfb6f162" ON "cinemas"  ("city") `);
        await queryRunner.query(`CREATE TYPE "public"."auditoriums_experience_type_enum" AS ENUM('STANDARD_2D', 'STANDARD_3D', 'IMAX_3D', 'FOUR_DX', 'VIP_LOUNGE')`);
        await queryRunner.query(`CREATE TABLE "auditoriums" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "cinema_id" uuid NOT NULL, "name" character varying(100) NOT NULL, "experience_type" "public"."auditoriums_experience_type_enum" NOT NULL, "sound_system" character varying(50), "total_rows" integer NOT NULL, "total_columns" integer NOT NULL, "total_seats" integer NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updated_at" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, CONSTRAINT "PK_7c89a4e25280efb7b40ae81a129" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."seats_seat_type_enum" AS ENUM('REGULAR', 'VIP', 'PREMIUM', 'COUPLE', 'WHEELCHAIR', 'EMPTY_SPACE')`);
        await queryRunner.query(`CREATE TABLE "seats" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "auditorium_id" uuid NOT NULL, "row_label" character varying(5) NOT NULL, "seat_number" integer NOT NULL, "grid_row" integer NOT NULL, "grid_column" integer NOT NULL, "seat_type" "public"."seats_seat_type_enum" NOT NULL DEFAULT 'REGULAR', "is_operational" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updated_at" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, CONSTRAINT "UQ_eafc3fe7bcfc5e26a588bbbf123" UNIQUE ("auditorium_id", "row_label", "seat_number"), CONSTRAINT "PK_3fbc74bb4638600c506dcb777a7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."showtimes_experience_type_enum" AS ENUM('STANDARD_2D', 'STANDARD_3D', 'IMAX_3D', 'FOUR_DX', 'VIP_LOUNGE')`);
        await queryRunner.query(`CREATE TYPE "public"."showtimes_status_enum" AS ENUM('SCHEDULED', 'SELLING', 'CANCELLED', 'COMPLETED')`);
        await queryRunner.query(`CREATE TABLE "showtimes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "movie_id" uuid NOT NULL, "auditorium_id" uuid NOT NULL, "start_time" TIMESTAMP WITH TIME ZONE NOT NULL, "end_time" TIMESTAMP WITH TIME ZONE NOT NULL, "experience_type" "public"."showtimes_experience_type_enum" NOT NULL, "base_price" numeric(10,2) NOT NULL, "status" "public"."showtimes_status_enum" NOT NULL DEFAULT 'SCHEDULED', "created_at" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updated_at" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, CONSTRAINT "PK_2d979092e692ec1a7b505893ee2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c0c512610e4b695c97a1ff3182" ON "showtimes"  ("start_time") `);
        await queryRunner.query(`CREATE INDEX "IDX_80eb6addbe5ffcf713116f3371" ON "showtimes"  ("end_time") `);
        await queryRunner.query(`CREATE TYPE "public"."showtime_seat_pricing_seat_type_enum" AS ENUM('REGULAR', 'VIP', 'PREMIUM', 'COUPLE', 'WHEELCHAIR', 'EMPTY_SPACE')`);
        await queryRunner.query(`CREATE TABLE "showtime_seat_pricing" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "showtime_id" uuid NOT NULL, "seat_type" "public"."showtime_seat_pricing_seat_type_enum" NOT NULL, "price" numeric(10,2) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updated_at" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, CONSTRAINT "UQ_3e0d0be458d40a6af79b8652ca5" UNIQUE ("showtime_id", "seat_type"), CONSTRAINT "PK_20956c5d6623776c882763d390e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "movie_genres" ("movie_id" uuid NOT NULL, "genre_id" uuid NOT NULL, CONSTRAINT "PK_ec45eae1bc95d1461ad55713ffc" PRIMARY KEY ("movie_id", "genre_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ae967ce58ef99e9ff3933ccea4" ON "movie_genres"  ("movie_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_bbbc12542564f7ff56e36f5bbf" ON "movie_genres"  ("genre_id") `);
        await queryRunner.query(`ALTER TABLE "auditoriums" ADD CONSTRAINT "FK_e31d88bd9218ef7162698e464ef" FOREIGN KEY ("cinema_id") REFERENCES "cinemas"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "seats" ADD CONSTRAINT "FK_6318c0a2de3d50b88e0e67a4ee9" FOREIGN KEY ("auditorium_id") REFERENCES "auditoriums"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "showtimes" ADD CONSTRAINT "FK_cbe689b0c116fbc866d8ea21759" FOREIGN KEY ("movie_id") REFERENCES "movies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "showtimes" ADD CONSTRAINT "FK_644ed0d19d5be302a1e00e31a1c" FOREIGN KEY ("auditorium_id") REFERENCES "auditoriums"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "showtime_seat_pricing" ADD CONSTRAINT "FK_c18bc48ecc681242de781be9315" FOREIGN KEY ("showtime_id") REFERENCES "showtimes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "movie_genres" ADD CONSTRAINT "FK_ae967ce58ef99e9ff3933ccea48" FOREIGN KEY ("movie_id") REFERENCES "movies"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "movie_genres" ADD CONSTRAINT "FK_bbbc12542564f7ff56e36f5bbf6" FOREIGN KEY ("genre_id") REFERENCES "genres"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "movie_genres" DROP CONSTRAINT "FK_bbbc12542564f7ff56e36f5bbf6"`);
        await queryRunner.query(`ALTER TABLE "movie_genres" DROP CONSTRAINT "FK_ae967ce58ef99e9ff3933ccea48"`);
        await queryRunner.query(`ALTER TABLE "showtime_seat_pricing" DROP CONSTRAINT "FK_c18bc48ecc681242de781be9315"`);
        await queryRunner.query(`ALTER TABLE "showtimes" DROP CONSTRAINT "FK_644ed0d19d5be302a1e00e31a1c"`);
        await queryRunner.query(`ALTER TABLE "showtimes" DROP CONSTRAINT "FK_cbe689b0c116fbc866d8ea21759"`);
        await queryRunner.query(`ALTER TABLE "seats" DROP CONSTRAINT "FK_6318c0a2de3d50b88e0e67a4ee9"`);
        await queryRunner.query(`ALTER TABLE "auditoriums" DROP CONSTRAINT "FK_e31d88bd9218ef7162698e464ef"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bbbc12542564f7ff56e36f5bbf"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ae967ce58ef99e9ff3933ccea4"`);
        await queryRunner.query(`DROP TABLE "movie_genres"`);
        await queryRunner.query(`DROP TABLE "showtime_seat_pricing"`);
        await queryRunner.query(`DROP TYPE "public"."showtime_seat_pricing_seat_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_80eb6addbe5ffcf713116f3371"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c0c512610e4b695c97a1ff3182"`);
        await queryRunner.query(`DROP TABLE "showtimes"`);
        await queryRunner.query(`DROP TYPE "public"."showtimes_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."showtimes_experience_type_enum"`);
        await queryRunner.query(`DROP TABLE "seats"`);
        await queryRunner.query(`DROP TYPE "public"."seats_seat_type_enum"`);
        await queryRunner.query(`DROP TABLE "auditoriums"`);
        await queryRunner.query(`DROP TYPE "public"."auditoriums_experience_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7d5e149eb3058d887cbfb6f162"`);
        await queryRunner.query(`DROP TABLE "cinemas"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5aa0bbd146c0082d3fc5a0ad5d"`);
        await queryRunner.query(`DROP TABLE "movies"`);
        await queryRunner.query(`DROP TYPE "public"."movies_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."movies_age_rating_enum"`);
        await queryRunner.query(`DROP TABLE "genres"`);
        await queryRunner.query(`DROP TABLE "outbox_messages"`);
        await queryRunner.query(`DROP TYPE "public"."outbox_messages_status_enum"`);
    }

}
