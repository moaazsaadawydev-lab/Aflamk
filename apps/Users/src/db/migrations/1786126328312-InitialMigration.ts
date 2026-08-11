import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1786126328312 implements MigrationInterface {
    name = 'InitialMigration1786126328312'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "test" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "test"`);
    }

}
