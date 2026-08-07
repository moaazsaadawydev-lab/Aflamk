import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1786127751448 implements MigrationInterface {
    name = 'InitialMigration1786127751448'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "test"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "test" character varying NOT NULL`);
    }

}
