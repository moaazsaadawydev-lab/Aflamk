import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { Showtime } from '@booking-ticket-system/Entities';
import { UpdateShowtimeDto } from '@booking-ticket-system/DTOs';
import { ShowtimeStatus } from '@booking-ticket-system/Utils';

@Injectable()
export class UpdateShowtimeProvider {
  private readonly logger = new Logger(UpdateShowtimeProvider.name);

  constructor(
    @InjectRepository(Showtime)
    private readonly showtimeRepository: Repository<Showtime>,
  ) {}

  async update(id: string, dto: UpdateShowtimeDto): Promise<any> {
    if (!id) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Showtime ID is required',
      });
    }

    const showtime = await this.showtimeRepository.findOne({
      where: { id },
      relations: {
        movie: { genres: true },
        auditorium: { cinema: true },
        seatPricings: true,
      },
    });

    if (!showtime) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: `Showtime with ID "${id}" not found`,
      });
    }

    if (dto.movieId !== undefined) showtime.movieId = dto.movieId;
    if (dto.auditoriumId !== undefined)
      showtime.auditoriumId = dto.auditoriumId;
    if (dto.startTime !== undefined)
      showtime.startTime = new Date(dto.startTime);
    if (dto.endTime !== undefined) showtime.endTime = new Date(dto.endTime);
    if (dto.experienceType !== undefined)
      showtime.experienceType = dto.experienceType;
    if (dto.basePrice !== undefined) showtime.basePrice = dto.basePrice;
    if (dto.status !== undefined) showtime.status = dto.status;

    if (showtime.startTime >= showtime.endTime) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Showtime start time must be before end time',
      });
    }

    const updated = await this.showtimeRepository.save(showtime);
    this.logger.log(`Updated showtime ${updated.id}`);

    return this.mapToResponse(updated);
  }

  async updateStatus(id: string, newStatus: ShowtimeStatus): Promise<any> {
    if (!id || !newStatus) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Showtime ID and status are required',
      });
    }

    const showtime = await this.showtimeRepository.findOne({
      where: { id },
      relations: {
        movie: { genres: true },
        auditorium: { cinema: true },
        seatPricings: true,
      },
    });

    if (!showtime) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: `Showtime with ID "${id}" not found`,
      });
    }

    showtime.status = newStatus;
    const updated = await this.showtimeRepository.save(showtime);
    this.logger.log(`Updated showtime ${id} status to ${newStatus}`);

    return this.mapToResponse(updated);
  }

  async delete(id: string): Promise<{ success: boolean; message: string }> {
    if (!id) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Showtime ID is required',
      });
    }

    const showtime = await this.showtimeRepository.findOne({ where: { id } });

    if (!showtime) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: `Showtime with ID "${id}" not found`,
      });
    }

    await this.showtimeRepository.remove(showtime);
    return {
      success: true,
      message: `Showtime "${id}" deleted successfully`,
    };
  }

  private mapToResponse(showtime: Showtime): any {
    const movie = showtime.movie;
    const auditorium = showtime.auditorium;
    const cinema = auditorium?.cinema;

    return {
      id: showtime.id,
      movie_id: showtime.movieId,
      auditorium_id: showtime.auditoriumId,
      start_time: showtime.startTime?.toISOString(),
      end_time: showtime.endTime?.toISOString(),
      experience_type: showtime.experienceType,
      base_price: Number(showtime.basePrice),
      status: showtime.status,
      movie: movie
        ? {
            id: movie.id,
            title: movie.title,
            slug: movie.slug,
            description: movie.description,
            duration_minutes: movie.durationMinutes,
            release_date:
              movie.releaseDate instanceof Date
                ? movie.releaseDate.toISOString().split('T')[0]
                : String(movie.releaseDate),
            age_rating: movie.ageRating,
            status: movie.status,
            original_language: movie.originalLanguage,
            poster_url: movie.posterUrl,
            banner_url: movie.bannerUrl,
            rating_average: Number(movie.ratingAverage) || 0,
            rating_count: movie.ratingCount || 0,
          }
        : null,
      auditorium: auditorium
        ? {
            id: auditorium.id,
            cinema_id: auditorium.cinemaId,
            name: auditorium.name,
            experience_type: auditorium.experienceType,
            sound_system: auditorium.soundSystem,
            total_rows: auditorium.totalRows,
            total_columns: auditorium.totalColumns,
            total_seats: auditorium.totalSeats,
            is_active: auditorium.isActive,
          }
        : null,
      cinema: cinema
        ? {
            id: cinema.id,
            name: cinema.name,
            slug: cinema.slug,
            city: cinema.city,
            address: cinema.address,
            latitude: cinema.latitude ? Number(cinema.latitude) : null,
            longitude: cinema.longitude ? Number(cinema.longitude) : null,
            is_active: cinema.isActive,
          }
        : null,
      seat_pricings: (showtime.seatPricings || []).map((p) => ({
        id: p.id,
        showtime_id: p.showtimeId,
        seat_type: p.seatType,
        price: Number(p.price),
        created_at: p.createdAt?.toISOString(),
        updated_at: p.updatedAt?.toISOString(),
      })),
      created_at: showtime.createdAt?.toISOString(),
      updated_at: showtime.updatedAt?.toISOString(),
    };
  }
}
