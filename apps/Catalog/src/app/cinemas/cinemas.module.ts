import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Auditorium, Cinema, Seat, Showtime } from '@booking-ticket-system/Entities';
import { CinemasController } from './cinemas.controller';
import { CreateCinemaProvider } from './providers/create-cinema.provider';
import { GetCinemaProvider } from './providers/get-cinema.provider';
import { ListCinemasProvider } from './providers/list-cinemas.provider';
import { UpdateCinemaProvider } from './providers/update-cinema.provider';
import { DeleteCinemaProvider } from './providers/delete-cinema.provider';
import { AuditoriumProvider } from './providers/auditorium.provider';

@Module({
  imports: [TypeOrmModule.forFeature([Cinema, Auditorium, Seat, Showtime])],
  controllers: [CinemasController],
  providers: [
    CreateCinemaProvider,
    GetCinemaProvider,
    ListCinemasProvider,
    UpdateCinemaProvider,
    DeleteCinemaProvider,
    AuditoriumProvider,
  ],
  exports: [
    CreateCinemaProvider,
    GetCinemaProvider,
    ListCinemasProvider,
    UpdateCinemaProvider,
    DeleteCinemaProvider,
    AuditoriumProvider,
  ],
})
export class CinemasModule {}
