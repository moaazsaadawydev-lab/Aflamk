import { Controller } from '@nestjs/common';
import { GrpcMethod, Payload } from '@nestjs/microservices';
import {
  BatchUpdateSeatsDto,
  GenerateSeatLayoutDto,
  UpdateSeatDto,
} from '@booking-ticket-system/DTOs';
import { GenerateSeatLayoutProvider } from './providers/generate-layout.provider';
import { GetSeatsProvider } from './providers/get-seats.provider';
import { UpdateSeatProvider } from './providers/update-seat.provider';

@Controller()
export class SeatsController {
  constructor(
    private readonly generateSeatLayoutProvider: GenerateSeatLayoutProvider,
    private readonly getSeatsProvider: GetSeatsProvider,
    private readonly updateSeatProvider: UpdateSeatProvider,
  ) {}

  @GrpcMethod('SeatsService', 'GenerateSeatLayout')
  async generateSeatLayout(@Payload() data: any): Promise<any> {
    const dto: GenerateSeatLayoutDto = {
      auditoriumId: data.auditoriumId || data.auditorium_id,
      totalRows: data.totalRows || data.total_rows,
      totalColumns: data.totalColumns || data.total_columns,
      customSeats: (data.customSeats || data.custom_seats || []).map((s: any) => ({
        rowLabel: s.rowLabel || s.row_label,
        seatNumber: s.seatNumber || s.seat_number,
        gridRow: s.gridRow || s.grid_row,
        gridColumn: s.gridColumn || s.grid_column,
        seatType: s.seatType || s.seat_type,
        isOperational:
          s.isOperational !== undefined ? s.isOperational : s.is_operational,
      })),
    };
    return await this.generateSeatLayoutProvider.execute(dto);
  }

  @GrpcMethod('SeatsService', 'GetSeatsByAuditorium')
  async getSeatsByAuditorium(@Payload() data: any): Promise<any> {
    const auditoriumId = data.auditoriumId || data.auditorium_id;
    return await this.getSeatsProvider.execute(auditoriumId);
  }

  @GrpcMethod('SeatsService', 'UpdateSeat')
  async updateSeat(@Payload() data: any): Promise<any> {
    const id = data.id;
    const dto: UpdateSeatDto = {
      seatType: data.seatType || data.seat_type,
      isOperational:
        data.isOperational !== undefined
          ? data.isOperational
          : data.is_operational,
    };
    return await this.updateSeatProvider.updateSingle(id, dto);
  }

  @GrpcMethod('SeatsService', 'BatchUpdateSeats')
  async batchUpdateSeats(@Payload() data: any): Promise<any> {
    const dto: BatchUpdateSeatsDto = {
      auditoriumId: data.auditoriumId || data.auditorium_id,
      seats: (data.seats || []).map((s: any) => ({
        id: s.id,
        seatType: s.seatType || s.seat_type,
        isOperational:
          s.isOperational !== undefined ? s.isOperational : s.is_operational,
      })),
    };
    return await this.updateSeatProvider.batchUpdate(dto);
  }
}
