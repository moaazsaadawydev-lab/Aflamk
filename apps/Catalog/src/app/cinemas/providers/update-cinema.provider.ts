import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { Cinema } from '@booking-ticket-system/Entities';
import { UpdateCinemaDto } from '@booking-ticket-system/DTOs';
import { slugify } from '@booking-ticket-system/Utils';

@Injectable()
export class UpdateCinemaProvider {
  private readonly logger = new Logger(UpdateCinemaProvider.name);

  constructor(
    @InjectRepository(Cinema)
    private readonly cinemaRepository: Repository<Cinema>,
  ) {}

  async execute(id: string, dto: UpdateCinemaDto): Promise<any> {
    if (!id) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Cinema ID is required',
      });
    }

    const cinema = await this.cinemaRepository.findOne({
      where: { id },
      relations: { auditoriums: true },
    });

    if (!cinema) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: `Cinema with ID "${id}" not found`,
      });
    }

    if (dto.name && dto.name !== cinema.name) {
      let slug = slugify(dto.name);
      const existingSlug = await this.cinemaRepository.findOne({
        where: { slug },
      });
      if (existingSlug && existingSlug.id !== cinema.id) {
        slug = `${slug}-${slugify(dto.city || cinema.city)}-${Date.now().toString().slice(-4)}`;
      }
      cinema.name = dto.name;
      cinema.slug = slug;
    }

    if (dto.city !== undefined) cinema.city = dto.city;
    if (dto.address !== undefined) cinema.address = dto.address;
    if (dto.latitude !== undefined) cinema.latitude = dto.latitude;
    if (dto.longitude !== undefined) cinema.longitude = dto.longitude;
    if (dto.phoneNumber !== undefined) cinema.phoneNumber = dto.phoneNumber;
    if (dto.facilities !== undefined) cinema.facilities = dto.facilities;
    if (dto.isActive !== undefined) cinema.isActive = dto.isActive;

    const updated = await this.cinemaRepository.save(cinema);
    this.logger.log(`Updated cinema "${updated.name}" (ID: ${updated.id})`);

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      city: updated.city,
      address: updated.address,
      latitude: updated.latitude ? Number(updated.latitude) : null,
      longitude: updated.longitude ? Number(updated.longitude) : null,
      phone_number: updated.phoneNumber || null,
      facilities: updated.facilities || [],
      is_active: updated.isActive,
      auditoriums: (updated.auditoriums || []).map((a) => ({
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
      created_at: updated.createdAt?.toISOString(),
      updated_at: updated.updatedAt?.toISOString(),
    };
  }
}
