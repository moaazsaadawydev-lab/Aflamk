import { DataSource, DataSourceOptions } from 'typeorm';
import {
  Genre,
  Movie,
  Cinema,
  CinemaAdmin,
  Auditorium,
  Seat,
  Showtime,
  ShowtimeSeatPricing,
  OutboxMessage,
} from '@booking-ticket-system/Entities';
import * as dotenv from 'dotenv';
import * as path from 'path';

const nodeEnv = process.env.NODE_ENV || 'development';
const envPath = path.resolve(process.cwd(), `libs/env/.env.${nodeEnv}`);
dotenv.config({ path: envPath });

export const CatalogDataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.CATALOG_DATABASE_NAME || 'Booking-Catalog',
  entities: [
    Genre,
    Movie,
    Cinema,
    CinemaAdmin,
    Auditorium,
    Seat,
    Showtime,
    ShowtimeSeatPricing,
    OutboxMessage,
  ],
  migrations: ['apps/Catalog/src/db/migrations/*.ts'],
  synchronize: false,
};

const dataSource = new DataSource(CatalogDataSourceOptions);
export default dataSource;
