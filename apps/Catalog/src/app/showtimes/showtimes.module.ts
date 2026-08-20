import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Auditorium,
  Movie,
  Showtime,
  ShowtimeSeatPricing,
} from '@booking-ticket-system/Entities';
import { ShowtimesController } from './showtimes.controller';
import { CreateShowtimeProvider } from './providers/create-showtime.provider';
import { GetShowtimeProvider } from './providers/get-showtime.provider';
import { ListShowtimesProvider } from './providers/list-showtimes.provider';
import { GroupedShowtimesProvider } from './providers/grouped-showtimes.provider';
import { UpdateShowtimeProvider } from './providers/update-showtime.provider';
import { ShowtimePricingProvider } from './providers/pricing.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Showtime,
      Movie,
      Auditorium,
      ShowtimeSeatPricing,
    ]),
  ],
  controllers: [ShowtimesController],
  providers: [
    CreateShowtimeProvider,
    GetShowtimeProvider,
    ListShowtimesProvider,
    GroupedShowtimesProvider,
    UpdateShowtimeProvider,
    ShowtimePricingProvider,
  ],
  exports: [
    CreateShowtimeProvider,
    GetShowtimeProvider,
    ListShowtimesProvider,
    GroupedShowtimesProvider,
    UpdateShowtimeProvider,
    ShowtimePricingProvider,
  ],
})
export class ShowtimesModule {}
