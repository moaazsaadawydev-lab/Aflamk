import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1786128796254 implements MigrationInterface {
    name = 'InitialMigration1786128796254'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "test"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" ADD "test" character varying NOT NULL`);
    }

}
