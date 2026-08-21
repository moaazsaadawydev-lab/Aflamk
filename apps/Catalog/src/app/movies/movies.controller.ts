import { Controller } from '@nestjs/common';
import { GrpcMethod, Payload } from '@nestjs/microservices';
import { CreateMovieDto, ListMoviesQueryDto, UpdateMovieDto } from '@booking-ticket-system/DTOs';
import { CreateMovieProvider } from './providers/create-movie.provider';
import { GetMovieProvider } from './providers/get-movie.provider';
import { ListMoviesProvider } from './providers/list-movies.provider';
import { UpdateMovieProvider } from './providers/update-movie.provider';
import { DeleteMovieProvider } from './providers/delete-movie.provider';
import { ListGenresProvider } from './providers/list-genres.provider';

@Controller()
export class MoviesController {
  constructor(
    private readonly createMovieProvider: CreateMovieProvider,
    private readonly getMovieProvider: GetMovieProvider,
    private readonly listMoviesProvider: ListMoviesProvider,
    private readonly updateMovieProvider: UpdateMovieProvider,
    private readonly deleteMovieProvider: DeleteMovieProvider,
    private readonly listGenresProvider: ListGenresProvider,
  ) {}

  @GrpcMethod('MoviesService', 'CreateMovie')
  async createMovie(@Payload() data: any): Promise<any> {
    const dto: CreateMovieDto = {
      title: data.title,
      description: data.description,
      durationMinutes: data.durationMinutes || data.duration_minutes,
      releaseDate: data.releaseDate || data.release_date,
      ageRating: data.ageRating || data.age_rating,
      status: data.status,
      originalLanguage: data.originalLanguage || data.original_language,
      spokenLanguages: data.spokenLanguages || data.spoken_languages,
      subtitles: data.subtitles,
      posterUrl: data.posterUrl || data.poster_url,
      bannerUrl: data.bannerUrl || data.banner_url,
      trailerUrl: data.trailerUrl || data.trailer_url,
      galleryUrls: data.galleryUrls || data.gallery_urls || [],
      directors: data.directors || [],
      cast: data.cast || [],
      genreIds: data.genreIds || data.genre_ids || [],
    };
    return await this.createMovieProvider.execute(dto);
  }

  @GrpcMethod('MoviesService', 'GetMovieById')
  async getMovieById(@Payload() data: any): Promise<any> {
    return await this.getMovieProvider.getById(data.id);
  }

  @GrpcMethod('MoviesService', 'GetMovieBySlug')
  async getMovieBySlug(@Payload() data: any): Promise<any> {
    return await this.getMovieProvider.getBySlug(data.slug);
  }

  @GrpcMethod('MoviesService', 'ListMovies')
  async listMovies(@Payload() data: any): Promise<any> {
    const query: ListMoviesQueryDto = {
      page: data.page,
      limit: data.limit,
      status: data.status,
      search: data.search,
      genreId: data.genreId || data.genre_id,
      genreSlug: data.genreSlug || data.genre_slug,
    };
    return await this.listMoviesProvider.execute(query);
  }

  @GrpcMethod('MoviesService', 'UpdateMovie')
  async updateMovie(@Payload() data: any): Promise<any> {
    const id = data.id;
    const dto: UpdateMovieDto = {
      title: data.title,
      description: data.description,
      durationMinutes: data.durationMinutes || data.duration_minutes,
      releaseDate: data.releaseDate || data.release_date,
      ageRating: data.ageRating || data.age_rating,
      status: data.status,
      originalLanguage: data.originalLanguage || data.original_language,
      spokenLanguages: data.spokenLanguages || data.spoken_languages,
      subtitles: data.subtitles,
      posterUrl: data.posterUrl || data.poster_url,
      bannerUrl: data.bannerUrl || data.banner_url,
      trailerUrl: data.trailerUrl || data.trailer_url,
      galleryUrls: data.galleryUrls || data.gallery_urls,
      directors: data.directors,
      cast: data.cast,
      genreIds: data.genreIds || data.genre_ids,
    };
    return await this.updateMovieProvider.execute(id, dto);
  }

  @GrpcMethod('MoviesService', 'DeleteMovie')
  async deleteMovie(@Payload() data: any): Promise<any> {
    return await this.deleteMovieProvider.execute(data.id);
  }

  @GrpcMethod('MoviesService', 'ListGenres')
  async listGenres(): Promise<any> {
    return await this.listGenresProvider.execute();
  }
}
