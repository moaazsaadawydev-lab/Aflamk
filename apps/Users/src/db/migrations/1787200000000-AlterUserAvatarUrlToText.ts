import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterUserAvatarUrlToText1787200000000 implements MigrationInterface {
  name = 'AlterUserAvatarUrlToText1787200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" ALTER COLUMN "avatarUrl" TYPE text;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" ALTER COLUMN "avatarUrl" TYPE character varying(500);
    `);
  }
}
