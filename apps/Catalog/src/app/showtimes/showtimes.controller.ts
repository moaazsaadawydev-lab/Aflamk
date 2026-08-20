import { Controller } from '@nestjs/common';
import { GrpcMethod, Payload } from '@nestjs/microservices';
import {
  CreateShowtimeDto,
  GroupedShowtimesQueryDto,
  ListShowtimesQueryDto,
  SetShowtimeSeatPricingsDto,
  UpdateShowtimeDto,
} from '@booking-ticket-system/DTOs';
import { CreateShowtimeProvider } from './providers/create-showtime.provider';
import { GetShowtimeProvider } from './providers/get-showtime.provider';
import { ListShowtimesProvider } from './providers/list-showtimes.provider';
import { GroupedShowtimesProvider } from './providers/grouped-showtimes.provider';
import { UpdateShowtimeProvider } from './providers/update-showtime.provider';
import { ShowtimePricingProvider } from './providers/pricing.provider';

@Controller()
export class ShowtimesController {
  constructor(
    private readonly createShowtimeProvider: CreateShowtimeProvider,
    private readonly getShowtimeProvider: GetShowtimeProvider,
    private readonly listShowtimesProvider: ListShowtimesProvider,
    private readonly groupedShowtimesProvider: GroupedShowtimesProvider,
    private readonly updateShowtimeProvider: UpdateShowtimeProvider,
    private readonly showtimePricingProvider: ShowtimePricingProvider,
  ) {}

  @GrpcMethod('ShowtimesService', 'CreateShowtime')
  async createShowtime(@Payload() data: any): Promise<any> {
    const dto: CreateShowtimeDto = {
      movieId: data.movieId || data.movie_id,
      auditoriumId: data.auditoriumId || data.auditorium_id,
      startTime: data.startTime || data.start_time,
      endTime: data.endTime || data.end_time,
      experienceType: data.experienceType || data.experience_type,
      basePrice: Number(data.basePrice !== undefined ? data.basePrice : data.base_price),
      status: data.status,
      customPricings: (data.customPricings || data.custom_pricings || []).map(
        (p: any) => ({
          seatType: p.seatType || p.seat_type,
          price: Number(p.price),
        }),
      ),
    };
    return await this.createShowtimeProvider.execute(dto);
  }

  @GrpcMethod('ShowtimesService', 'GetShowtimeById')
  async getShowtimeById(@Payload() data: any): Promise<any> {
    return await this.getShowtimeProvider.execute(data.id);
  }

  @GrpcMethod('ShowtimesService', 'ListShowtimes')
  async listShowtimes(@Payload() data: any): Promise<any> {
    const query: ListShowtimesQueryDto = {
      page: data.page,
      limit: data.limit,
      movieId: data.movieId || data.movie_id,
      cinemaId: data.cinemaId || data.cinema_id,
      auditoriumId: data.auditoriumId || data.auditorium_id,
      date: data.date,
      startDate: data.startDate || data.start_date,
      endDate: data.endDate || data.end_date,
      experienceType: data.experienceType || data.experience_type,
      status: data.status,
    };
    return await this.listShowtimesProvider.execute(query);
  }

  @GrpcMethod('ShowtimesService', 'GetShowtimesGroupedByCinema')
  async getShowtimesGroupedByCinema(@Payload() data: any): Promise<any> {
    const query: GroupedShowtimesQueryDto = {
      movieId: data.movieId || data.movie_id,
      date: data.date,
      city: data.city,
    };
    return await this.groupedShowtimesProvider.execute(query);
  }

  @GrpcMethod('ShowtimesService', 'UpdateShowtime')
  async updateShowtime(@Payload() data: any): Promise<any> {
    const id = data.id;
    const dto: UpdateShowtimeDto = {
      movieId: data.movieId || data.movie_id,
      auditoriumId: data.auditoriumId || data.auditorium_id,
      startTime: data.startTime || data.start_time,
      endTime: data.endTime || data.end_time,
      experienceType: data.experienceType || data.experience_type,
      basePrice:
        data.basePrice !== undefined
          ? Number(data.basePrice)
          : data.base_price !== undefined
            ? Number(data.base_price)
            : undefined,
      status: data.status,
    };
    return await this.updateShowtimeProvider.update(id, dto);
  }

  @GrpcMethod('ShowtimesService', 'UpdateShowtimeStatus')
  async updateShowtimeStatus(@Payload() data: any): Promise<any> {
    return await this.updateShowtimeProvider.updateStatus(data.id, data.status);
  }

  @GrpcMethod('ShowtimesService', 'DeleteShowtime')
  async deleteShowtime(@Payload() data: any): Promise<any> {
    return await this.updateShowtimeProvider.delete(data.id);
  }

  @GrpcMethod('ShowtimesService', 'SetShowtimeSeatPricings')
  async setShowtimeSeatPricings(@Payload() data: any): Promise<any> {
    const showtimeId = data.showtimeId || data.showtime_id;
    const rawPricings =
      data.pricings ||
      data.custom_pricings ||
      data.customPricings ||
      [];

    const dto: SetShowtimeSeatPricingsDto = {
      showtimeId,
      pricings: (Array.isArray(rawPricings) ? rawPricings : []).map((p: any) => ({
        seatType: p.seatType || p.seat_type,
        price: Number(p.price),
      })),
    };
    return await this.showtimePricingProvider.setPricings(dto);
  }
}
