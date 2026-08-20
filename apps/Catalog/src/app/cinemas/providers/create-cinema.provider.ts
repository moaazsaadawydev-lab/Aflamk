import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cinema } from '@booking-ticket-system/Entities';
import { CreateCinemaDto } from '@booking-ticket-system/DTOs';
import { slugify } from '@booking-ticket-system/Utils';

@Injectable()
export class CreateCinemaProvider {
  private readonly logger = new Logger(CreateCinemaProvider.name);

  constructor(
    @InjectRepository(Cinema)
    private readonly cinemaRepository: Repository<Cinema>,
  ) {}

  async execute(dto: CreateCinemaDto): Promise<any> {
    let slug = slugify(dto.name);
    const existingSlug = await this.cinemaRepository.findOne({
      where: { slug },
    });

    if (existingSlug) {
      slug = `${slug}-${slugify(dto.city)}-${Date.now().toString().slice(-4)}`;
    }

    const cinema = this.cinemaRepository.create({
      name: dto.name,
      slug,
      city: dto.city,
      address: dto.address,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      phoneNumber: dto.phoneNumber ?? null,
      facilities: dto.facilities || [],
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    });

    const saved = await this.cinemaRepository.save(cinema);
    this.logger.log(`Created cinema "${saved.name}" (ID: ${saved.id})`);

    return this.mapToResponse(saved);
  }

  private mapToResponse(cinema: Cinema): any {
    return {
      id: cinema.id,
      name: cinema.name,
      slug: cinema.slug,
      city: cinema.city,
      address: cinema.address,
      latitude: cinema.latitude ? Number(cinema.latitude) : null,
      longitude: cinema.longitude ? Number(cinema.longitude) : null,
      phone_number: cinema.phoneNumber || null,
      facilities: cinema.facilities || [],
      is_active: cinema.isActive,
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
