import { DataSource, DataSourceOptions } from 'typeorm';
import { Users, OutboxMessage } from '@booking-ticket-system/Entities';
import * as dotenv from 'dotenv';
import * as path from 'path';

const envPath = path.resolve(process.cwd(), 'libs/env/.env.development');
dotenv.config({ path: envPath });

export const UsersDataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: Number(process.env.DATABASE_PORT) || 5432,
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || '624562',
  database: process.env.USERS_DATABASE_NAME || 'Booking-Users',
  entities: [Users, OutboxMessage],
  migrations: ['apps/Users/src/db/migrations/*.ts'],
  synchronize: false,
};

const dataSource = new DataSource(UsersDataSourceOptions);
export default dataSource;
