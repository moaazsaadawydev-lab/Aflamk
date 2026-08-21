import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { Genre, Movie, Showtime } from '@booking-ticket-system/Entities';
import { MovieAgeRating, MovieStatus } from '@booking-ticket-system/Utils';
import { CreateMovieProvider } from '../src/app/movies/providers/create-movie.provider';
import { GetMovieProvider } from '../src/app/movies/providers/get-movie.provider';
import { ListMoviesProvider } from '../src/app/movies/providers/list-movies.provider';
import { UpdateMovieProvider } from '../src/app/movies/providers/update-movie.provider';
import { DeleteMovieProvider } from '../src/app/movies/providers/delete-movie.provider';
import { ListGenresProvider } from '../src/app/movies/providers/list-genres.provider';
import { MoviesController } from '../src/app/movies/movies.controller';

describe('Movies Domain Suite', () => {
  let moviesController: MoviesController;
  let movieRepository: jest.Mocked<Repository<Movie>>;
  let genreRepository: jest.Mocked<Repository<Genre>>;
  let showtimeRepository: jest.Mocked<Repository<Showtime>>;

  const mockGenre: Genre = {
    id: 'genre-1',
    name: 'Action',
    slug: 'action',
    movies: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMovie: Movie = {
    id: 'movie-1',
    title: 'Inception',
    slug: 'inception',
    description: 'A thief who steals corporate secrets through dream-sharing technology.',
    durationMinutes: 148,
    releaseDate: '2010-07-16',
    ageRating: MovieAgeRating.PG_13,
    status: MovieStatus.NOW_SHOWING,
    originalLanguage: 'en',
    spokenLanguages: ['en', 'ja', 'fr'],
    subtitles: ['en', 'es', 'ar'],
    posterUrl: 'https://example.com/inception.jpg',
    bannerUrl: 'https://example.com/inception-banner.jpg',
    trailerUrl: 'https://example.com/inception-trailer.mp4',
    galleryUrls: ['https://example.com/inception-gallery-1.jpg'],
    directors: ['Christopher Nolan'],
    cast: ['Leonardo DiCaprio', 'Joseph Gordon-Levitt', 'Elliot Page'],
    ratingAverage: 4.8,
    ratingCount: 2500,
    genres: [mockGenre],
    showtimes: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MoviesController],
      providers: [
        CreateMovieProvider,
        GetMovieProvider,
        ListMoviesProvider,
        UpdateMovieProvider,
        DeleteMovieProvider,
        ListGenresProvider,
        {
          provide: getRepositoryToken(Movie),
          useValue: {
            create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 'movie-1' })),
            save: jest.fn().mockImplementation((m) => Promise.resolve({ ...m, id: m.id || 'movie-1' })),
            findOne: jest.fn(),
            find: jest.fn(),
            softRemove: jest.fn().mockResolvedValue(undefined),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Genre),
          useValue: {
            find: jest.fn().mockResolvedValue([mockGenre]),
            findOne: jest.fn().mockResolvedValue(mockGenre),
          },
        },
        {
          provide: getRepositoryToken(Showtime),
          useValue: {
            count: jest.fn().mockResolvedValue(0),
          },
        },
      ],
    }).compile();

    moviesController = module.get<MoviesController>(MoviesController);
    movieRepository = module.get(getRepositoryToken(Movie));
    genreRepository = module.get(getRepositoryToken(Genre));
    showtimeRepository = module.get(getRepositoryToken(Showtime));
  });

  describe('CreateMovie', () => {
    it('should create a movie and format response', async () => {
      movieRepository.findOne.mockResolvedValue(null);
      genreRepository.find.mockResolvedValue([mockGenre]);

      const result = await moviesController.createMovie({
        title: 'Inception',
        description: 'Dream heist thriller',
        duration_minutes: 148,
        release_date: '2010-07-16',
        age_rating: MovieAgeRating.PG_13,
        status: MovieStatus.NOW_SHOWING,
        original_language: 'en',
        directors: ['Christopher Nolan'],
        cast: ['Leonardo DiCaprio'],
        genre_ids: ['genre-1'],
      });

      expect(result.title).toBe('Inception');
      expect(result.slug).toBe('inception');
      expect(result.duration_minutes).toBe(148);
      expect(movieRepository.save).toHaveBeenCalled();
    });
  });

  describe('GetMovieById and GetMovieBySlug', () => {
    it('should return movie by ID', async () => {
      movieRepository.findOne.mockResolvedValue(mockMovie);

      const result = await moviesController.getMovieById({ id: 'movie-1' });
      expect(result.id).toBe('movie-1');
      expect(result.title).toBe('Inception');
      expect(result.genres.length).toBe(1);
    });

    it('should return movie by slug', async () => {
      movieRepository.findOne.mockResolvedValue(mockMovie);

      const result = await moviesController.getMovieBySlug({ slug: 'inception' });
      expect(result.slug).toBe('inception');
    });

    it('should throw NOT_FOUND if movie is missing', async () => {
      movieRepository.findOne.mockResolvedValue(null);

      await expect(moviesController.getMovieById({ id: 'non-existent' })).rejects.toThrow(
        RpcException,
      );
    });
  });

  describe('ListMovies', () => {
    it('should list movies with pagination and filters', async () => {
      const qbMock: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockMovie], 1]),
      };
      movieRepository.createQueryBuilder.mockReturnValue(qbMock);

      const result = await moviesController.listMovies({
        page: 1,
        limit: 10,
        status: MovieStatus.NOW_SHOWING,
        search: 'Inception',
        genre_slug: 'action',
      });

      expect(result.items.length).toBe(1);
      expect(result.meta.total_items).toBe(1);
      expect(result.meta.current_page).toBe(1);
    });
  });

  describe('UpdateMovie', () => {
    it('should update movie fields', async () => {
      movieRepository.findOne.mockResolvedValue({ ...mockMovie });

      const result = await moviesController.updateMovie({
        id: 'movie-1',
        title: 'Inception: Remastered',
        duration_minutes: 150,
      });

      expect(result.title).toBe('Inception: Remastered');
      expect(movieRepository.save).toHaveBeenCalled();
    });
  });

  describe('DeleteMovie', () => {
    it('should soft-delete movie when no active showtimes exist', async () => {
      movieRepository.findOne.mockResolvedValue(mockMovie);
      showtimeRepository.count.mockResolvedValue(0);

      const result = await moviesController.deleteMovie({ id: 'movie-1' });
      expect(result.success).toBe(true);
      expect(movieRepository.softRemove).toHaveBeenCalled();
    });

    it('should reject deletion if active showtimes exist', async () => {
      movieRepository.findOne.mockResolvedValue(mockMovie);
      showtimeRepository.count.mockResolvedValue(3);

      await expect(moviesController.deleteMovie({ id: 'movie-1' })).rejects.toThrow(
        RpcException,
      );
    });
  });

  describe('ListGenres', () => {
    it('should list all genres', async () => {
      genreRepository.find.mockResolvedValue([mockGenre]);

      const result = await moviesController.listGenres();
      expect(result.genres.length).toBe(1);
      expect(result.genres[0].name).toBe('Action');
    });
  });
});
