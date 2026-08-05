import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1785953098635 implements MigrationInterface {
    name = 'InitialMigration1785953098635'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "softDelete" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "softDelete"`);
    }

}
