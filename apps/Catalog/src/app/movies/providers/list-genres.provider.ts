import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Genre } from '@booking-ticket-system/Entities';

@Injectable()
export class ListGenresProvider {
  constructor(
    @InjectRepository(Genre)
    private readonly genreRepository: Repository<Genre>,
  ) {}

  async execute(): Promise<any> {
    const genres = await this.genreRepository.find({
      order: { name: 'ASC' },
    });

    return {
      genres: genres.map((g) => ({
        id: g.id,
        name: g.name,
        slug: g.slug,
        created_at: g.createdAt?.toISOString(),
        updated_at: g.updatedAt?.toISOString(),
      })),
    };
  }
}
