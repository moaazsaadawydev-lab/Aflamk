import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Users, OutboxMessage } from '@booking-ticket-system/Entities';

config({ path: `libs/env/.env.${process.env.NODE_ENV}` });

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.USERS_DATABASE_NAME,
  entities: [Users, OutboxMessage],
  migrations: ['apps/Users/src/migrations/*.ts'],
  synchronize: false,
});
