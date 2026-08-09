import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1786197502225 implements MigrationInterface {
    name = 'InitialMigration1786197502225'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" ADD "sourceEventId" character varying`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "UQ_852c2d45895a0b1995450634064" UNIQUE ("sourceEventId")`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "email" character varying`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "emailTemplate" character varying`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "emailContext" jsonb`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_emailstatus_enum" AS ENUM('PENDING', 'SENT', 'FAILED')`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "emailStatus" "public"."notifications_emailstatus_enum" NOT NULL DEFAULT 'PENDING'`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "emailRetryCount" integer NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "emailRetryCount"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "emailStatus"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_emailstatus_enum"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "emailContext"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "emailTemplate"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "email"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "UQ_852c2d45895a0b1995450634064"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "sourceEventId"`);
    }

}
