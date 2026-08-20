import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { Auditorium, Seat } from '@booking-ticket-system/Entities';

@Injectable()
export class GetSeatsProvider {
  constructor(
    @InjectRepository(Auditorium)
    private readonly auditoriumRepository: Repository<Auditorium>,
    @InjectRepository(Seat)
    private readonly seatRepository: Repository<Seat>,
  ) {}

  async execute(auditoriumId: string): Promise<any> {
    if (!auditoriumId) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Auditorium ID is required',
      });
    }

    const auditorium = await this.auditoriumRepository.findOne({
      where: { id: auditoriumId },
    });

    if (!auditorium) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: `Auditorium with ID "${auditoriumId}" not found`,
      });
    }

    const seats = await this.seatRepository.find({
      where: { auditoriumId },
      order: { gridRow: 'ASC', gridColumn: 'ASC' },
    });

    return {
      auditorium_id: auditorium.id,
      total_rows: auditorium.totalRows,
      total_columns: auditorium.totalColumns,
      total_seats: auditorium.totalSeats,
      seats: seats.map((s) => ({
        id: s.id,
        auditorium_id: s.auditoriumId,
        row_label: s.rowLabel,
        seat_number: s.seatNumber,
        grid_row: s.gridRow,
        grid_column: s.gridColumn,
        seat_type: s.seatType,
        is_operational: s.isOperational,
        created_at: s.createdAt?.toISOString(),
        updated_at: s.updatedAt?.toISOString(),
      })),
    };
  }
}
