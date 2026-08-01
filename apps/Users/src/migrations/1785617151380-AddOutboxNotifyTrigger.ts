import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOutboxNotifyTrigger1785617151380 implements MigrationInterface {
  name = 'AddOutboxNotifyTrigger1785617151380';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION notify_outbox_insert()
      RETURNS trigger AS $$
      BEGIN
        PERFORM pg_notify('outbox_channel', NEW.id::text);
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER outbox_insert_trigger
      AFTER INSERT ON outbox_messages
      FOR EACH ROW EXECUTE FUNCTION notify_outbox_insert();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS outbox_insert_trigger ON outbox_messages;
    `);
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS notify_outbox_insert;
    `);
  }
}
