import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Genre, Movie } from '@booking-ticket-system/Entities';
import { CreateMovieDto } from '@booking-ticket-system/DTOs';
import { slugify } from '@booking-ticket-system/Utils';

@Injectable()
export class CreateMovieProvider {
  private readonly logger = new Logger(CreateMovieProvider.name);

  constructor(
    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>,
    @InjectRepository(Genre)
    private readonly genreRepository: Repository<Genre>,
  ) {}

  async execute(dto: CreateMovieDto): Promise<any> {
    let slug = slugify(dto.title);
    const existingSlug = await this.movieRepository.findOne({
      where: { slug },
    });

    if (existingSlug) {
      slug = `${slug}-${Date.now().toString().slice(-6)}`;
    }

    const genreIds = dto.genreIds ?? (dto as any).genre_ids ?? [];
    let genres: Genre[] = [];
    if (genreIds.length > 0) {
      genres = await this.genreRepository.find({
        where: { id: In(genreIds) },
      });
    }

    const durationMinutes = Number(dto.durationMinutes ?? (dto as any).duration_minutes);
    const releaseDate = dto.releaseDate ?? (dto as any).release_date;
    const ageRating = dto.ageRating ?? (dto as any).age_rating;
    const originalLanguage = dto.originalLanguage ?? (dto as any).original_language;
    const spokenLanguages = dto.spokenLanguages ?? (dto as any).spoken_languages ?? [];
    const subtitles = dto.subtitles ?? [];
    const posterUrl = dto.posterUrl ?? (dto as any).poster_url ?? null;
    const bannerUrl = dto.bannerUrl ?? (dto as any).banner_url ?? null;
    const trailerUrl = dto.trailerUrl ?? (dto as any).trailer_url ?? null;
    const directors = dto.directors ?? [];
    const cast = dto.cast ?? [];

    const movie = this.movieRepository.create({
      title: dto.title,
      slug,
      description: dto.description,
      durationMinutes,
      releaseDate,
      ageRating,
      status: dto.status,
      originalLanguage,
      spokenLanguages,
      subtitles,
      posterUrl,
      bannerUrl,
      trailerUrl,
      directors,
      cast,
      genres,
      ratingAverage: 0,
      ratingCount: 0,
    });

    const savedMovie = await this.movieRepository.save(movie);
    this.logger.log(`Created movie "${savedMovie.title}" (ID: ${savedMovie.id})`);

    return this.mapToResponse(savedMovie);
  }

  private mapToResponse(movie: Movie): any {
    return {
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
    };
  }
}
