import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Auditorium, Seat } from '@booking-ticket-system/Entities';
import { SeatsController } from './seats.controller';
import { GenerateSeatLayoutProvider } from './providers/generate-layout.provider';
import { GetSeatsProvider } from './providers/get-seats.provider';
import { UpdateSeatProvider } from './providers/update-seat.provider';

@Module({
  imports: [TypeOrmModule.forFeature([Auditorium, Seat])],
  controllers: [SeatsController],
  providers: [
    GenerateSeatLayoutProvider,
    GetSeatsProvider,
    UpdateSeatProvider,
  ],
  exports: [
    GenerateSeatLayoutProvider,
    GetSeatsProvider,
    UpdateSeatProvider,
  ],
})
export class SeatsModule {}
