import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Movie } from '@booking-ticket-system/Entities';
import { ListMoviesQueryDto } from '@booking-ticket-system/DTOs';

@Injectable()
export class ListMoviesProvider {
  constructor(
    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>,
  ) {}

  async execute(query: ListMoviesQueryDto): Promise<any> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const qb = this.movieRepository
      .createQueryBuilder('movie')
      .leftJoinAndSelect('movie.genres', 'genre');

    if (query.status) {
      qb.andWhere('movie.status = :status', { status: query.status });
    }

    if (query.search && query.search.trim()) {
      qb.andWhere('movie.title ILIKE :search', {
        search: `%${query.search.trim()}%`,
      });
    }

    if (query.genreId) {
      qb.andWhere('genre.id = :genreId', { genreId: query.genreId });
    }

    if (query.genreSlug) {
      qb.andWhere('genre.slug = :genreSlug', { genreSlug: query.genreSlug });
    }

    qb.orderBy('movie.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [items, totalItems] = await qb.getManyAndCount();

    const totalPages = Math.ceil(totalItems / limit);

    return {
      items: items.map((movie) => ({
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
        spoken_languages: movie.spokenLanguages || [],
        subtitles: movie.subtitles || [],
        poster_url: movie.posterUrl || null,
        banner_url: movie.bannerUrl || null,
        trailer_url: movie.trailerUrl || null,
        gallery_urls: movie.galleryUrls || [],
        directors: movie.directors || [],
        cast: movie.cast || [],
        rating_average: Number(movie.ratingAverage) || 0,
        rating_count: movie.ratingCount || 0,
        genres: (movie.genres || []).map((g) => ({
          id: g.id,
          name: g.name,
          slug: g.slug,
          created_at: g.createdAt?.toISOString(),
          updated_at: g.updatedAt?.toISOString(),
        })),
        created_at: movie.createdAt?.toISOString(),
        updated_at: movie.updatedAt?.toISOString(),
      })),
      meta: {
        total_items: totalItems,
        item_count: items.length,
        items_per_page: limit,
        total_pages: totalPages,
        current_page: page,
      },
    };
  }
}
