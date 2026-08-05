import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1785937784869 implements MigrationInterface {
    name = 'InitialMigration1785937784869'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "testField"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "testField" character varying`);
    }

}
