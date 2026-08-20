import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { Genre, Movie } from '@booking-ticket-system/Entities';
import { UpdateMovieDto } from '@booking-ticket-system/DTOs';
import { slugify } from '@booking-ticket-system/Utils';

@Injectable()
export class UpdateMovieProvider {
  private readonly logger = new Logger(UpdateMovieProvider.name);

  constructor(
    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>,
    @InjectRepository(Genre)
    private readonly genreRepository: Repository<Genre>,
  ) {}

  async execute(id: string, dto: UpdateMovieDto): Promise<any> {
    if (!id) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Movie ID is required',
      });
    }

    const movie = await this.movieRepository.findOne({
      where: { id },
      relations: { genres: true },
    });

    if (!movie) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: `Movie with ID "${id}" not found`,
      });
    }

    if (dto.title && dto.title !== movie.title) {
      let slug = slugify(dto.title);
      const existingSlug = await this.movieRepository.findOne({
        where: { slug },
      });
      if (existingSlug && existingSlug.id !== movie.id) {
        slug = `${slug}-${Date.now().toString().slice(-6)}`;
      }
      movie.title = dto.title;
      movie.slug = slug;
    }

    if (dto.description !== undefined) movie.description = dto.description;
    if (dto.durationMinutes !== undefined)
      movie.durationMinutes = dto.durationMinutes;
    if (dto.releaseDate !== undefined) movie.releaseDate = dto.releaseDate;
    if (dto.ageRating !== undefined) movie.ageRating = dto.ageRating;
    if (dto.status !== undefined) movie.status = dto.status;
    if (dto.originalLanguage !== undefined)
      movie.originalLanguage = dto.originalLanguage;
    if (dto.spokenLanguages !== undefined)
      movie.spokenLanguages = dto.spokenLanguages;
    if (dto.subtitles !== undefined) movie.subtitles = dto.subtitles;
    if (dto.posterUrl !== undefined) movie.posterUrl = dto.posterUrl;
    if (dto.bannerUrl !== undefined) movie.bannerUrl = dto.bannerUrl;
    if (dto.trailerUrl !== undefined) movie.trailerUrl = dto.trailerUrl;
    if (dto.directors !== undefined) movie.directors = dto.directors;
    if (dto.cast !== undefined) movie.cast = dto.cast;

    if (dto.genreIds !== undefined) {
      if (dto.genreIds.length > 0) {
        movie.genres = await this.genreRepository.find({
          where: { id: In(dto.genreIds) },
        });
      } else {
        movie.genres = [];
      }
    }

    const updated = await this.movieRepository.save(movie);
    this.logger.log(`Updated movie "${updated.title}" (ID: ${updated.id})`);

    return this.mapToResponse(updated);
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
