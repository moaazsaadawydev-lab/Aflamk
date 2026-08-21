import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { Cinema } from '@booking-ticket-system/Entities';

@Injectable()
export class GetCinemaProvider {
  constructor(
    @InjectRepository(Cinema)
    private readonly cinemaRepository: Repository<Cinema>,
  ) {}

  async getById(id: string): Promise<any> {
    if (!id) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Cinema ID is required',
      });
    }

    const cinema = await this.cinemaRepository.findOne({
      where: { id },
      relations: { auditoriums: true, admins: true },
    });

    if (!cinema) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: `Cinema with ID "${id}" not found`,
      });
    }

    return this.mapToResponse(cinema);
  }

  async getBySlug(slug: string): Promise<any> {
    if (!slug) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Cinema slug is required',
      });
    }

    const cinema = await this.cinemaRepository.findOne({
      where: { slug },
      relations: { auditoriums: true, admins: true },
    });

    if (!cinema) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: `Cinema with slug "${slug}" not found`,
      });
    }

    return this.mapToResponse(cinema);
  }

  public mapToResponse(cinema: Cinema): any {
    return {
      id: cinema.id,
      name: cinema.name,
      slug: cinema.slug,
      description: cinema.description || null,
      city: cinema.city,
      address: cinema.address,
      latitude: cinema.latitude ? Number(cinema.latitude) : null,
      longitude: cinema.longitude ? Number(cinema.longitude) : null,
      phone_number: cinema.phoneNumber || null,
      facilities: cinema.facilities || [],
      thumbnail_url: cinema.thumbnailUrl || null,
      gallery_urls: cinema.galleryUrls || [],
      is_active: cinema.isActive,
      admin_user_ids: (cinema.admins || []).map((a) => a.userId),
      auditoriums: (cinema.auditoriums || []).map((a) => ({
        id: a.id,
        cinema_id: a.cinemaId,
        name: a.name,
        experience_type: a.experienceType,
        sound_system: a.soundSystem || null,
        total_rows: a.totalRows,
        total_columns: a.totalColumns,
        total_seats: a.totalSeats,
        is_active: a.isActive,
        created_at: a.createdAt?.toISOString(),
        updated_at: a.updatedAt?.toISOString(),
      })),
      created_at: cinema.createdAt?.toISOString(),
      updated_at: cinema.updatedAt?.toISOString(),
    };
  }
}
