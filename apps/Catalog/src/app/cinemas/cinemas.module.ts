import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Auditorium,
  Cinema,
  CinemaAdmin,
  Seat,
  Showtime,
} from '@booking-ticket-system/Entities';
import { CinemasController } from './cinemas.controller';
import { CreateCinemaProvider } from './providers/create-cinema.provider';
import { GetCinemaProvider } from './providers/get-cinema.provider';
import { ListCinemasProvider } from './providers/list-cinemas.provider';
import { UpdateCinemaProvider } from './providers/update-cinema.provider';
import { DeleteCinemaProvider } from './providers/delete-cinema.provider';
import { AuditoriumProvider } from './providers/auditorium.provider';
import { CinemaAdminProvider } from './providers/cinema-admin.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Cinema,
      CinemaAdmin,
      Auditorium,
      Seat,
      Showtime,
    ]),
  ],
  controllers: [CinemasController],
  providers: [
    CreateCinemaProvider,
    GetCinemaProvider,
    ListCinemasProvider,
    UpdateCinemaProvider,
    DeleteCinemaProvider,
    AuditoriumProvider,
    CinemaAdminProvider,
  ],
  exports: [
    CreateCinemaProvider,
    GetCinemaProvider,
    ListCinemasProvider,
    UpdateCinemaProvider,
    DeleteCinemaProvider,
    AuditoriumProvider,
    CinemaAdminProvider,
  ],
})
export class CinemasModule {}
