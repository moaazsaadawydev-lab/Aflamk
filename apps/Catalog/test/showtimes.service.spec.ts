import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import {
  Auditorium,
  Cinema,
  Movie,
  Showtime,
  ShowtimeSeatPricing,
} from '@booking-ticket-system/Entities';
import {
  ExperienceType,
  MovieAgeRating,
  MovieStatus,
  SeatType,
  ShowtimeStatus,
} from '@booking-ticket-system/Utils';
import { CreateShowtimeProvider } from '../src/app/showtimes/providers/create-showtime.provider';
import { GetShowtimeProvider } from '../src/app/showtimes/providers/get-showtime.provider';
import { ListShowtimesProvider } from '../src/app/showtimes/providers/list-showtimes.provider';
import { GroupedShowtimesProvider } from '../src/app/showtimes/providers/grouped-showtimes.provider';
import { UpdateShowtimeProvider } from '../src/app/showtimes/providers/update-showtime.provider';
import { ShowtimePricingProvider } from '../src/app/showtimes/providers/pricing.provider';
import { ShowtimesController } from '../src/app/showtimes/showtimes.controller';

describe('Showtimes Domain Suite', () => {
  let showtimesController: ShowtimesController;
  let movieRepository: jest.Mocked<Repository<Movie>>;
  let auditoriumRepository: jest.Mocked<Repository<Auditorium>>;
  let showtimeRepository: jest.Mocked<Repository<Showtime>>;
  let pricingRepository: jest.Mocked<Repository<ShowtimeSeatPricing>>;
  let mockQueryRunner: any;

  const mockCinema: Cinema = {
    id: 'cinema-1',
    name: 'Grand Nile Cinema',
    slug: 'grand-nile-cinema',
    city: 'Cairo',
    address: 'Nile Corniche',
    latitude: 30.0,
    longitude: 31.0,
    phoneNumber: null,
    facilities: [],
    isActive: true,
    auditoriums: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAuditorium: Auditorium = {
    id: 'aud-1',
    cinemaId: 'cinema-1',
    name: 'Hall 1 IMAX',
    experienceType: ExperienceType.IMAX_3D,
    soundSystem: 'Dolby Atmos',
    totalRows: 5,
    totalColumns: 10,
    totalSeats: 50,
    isActive: true,
    cinema: mockCinema,
    seats: [],
    showtimes: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMovie: Movie = {
    id: 'movie-1',
    title: 'Inception',
    slug: 'inception',
    description: 'Dream heist thriller',
    durationMinutes: 148,
    releaseDate: '2010-07-16',
    ageRating: MovieAgeRating.PG_13,
    status: MovieStatus.NOW_SHOWING,
    originalLanguage: 'en',
    spokenLanguages: ['en'],
    subtitles: [],
    posterUrl: null,
    bannerUrl: null,
    trailerUrl: null,
    directors: ['Christopher Nolan'],
    cast: ['Leonardo DiCaprio'],
    ratingAverage: 4.8,
    ratingCount: 100,
    genres: [],
    showtimes: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockShowtime: Showtime = {
    id: 'st-1',
    movieId: 'movie-1',
    auditoriumId: 'aud-1',
    startTime: new Date('2026-08-20T18:00:00.000Z'),
    endTime: new Date('2026-08-20T20:30:00.000Z'),
    experienceType: ExperienceType.IMAX_3D,
    basePrice: 150.0,
    status: ShowtimeStatus.SCHEDULED,
    movie: mockMovie,
    auditorium: mockAuditorium,
    seatPricings: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockQueryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {
        delete: jest.fn().mockResolvedValue(undefined),
        create: jest.fn().mockImplementation((entity, obj) => ({ ...obj, id: obj.id || 'st-1' })),
        save: jest.fn().mockImplementation((entity, obj) => Promise.resolve(obj)),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShowtimesController],
      providers: [
        CreateShowtimeProvider,
        GetShowtimeProvider,
        ListShowtimesProvider,
        GroupedShowtimesProvider,
        UpdateShowtimeProvider,
        ShowtimePricingProvider,
        {
          provide: getRepositoryToken(Movie),
          useValue: {
            findOne: jest.fn().mockResolvedValue(mockMovie),
          },
        },
        {
          provide: getRepositoryToken(Auditorium),
          useValue: {
            findOne: jest.fn().mockResolvedValue(mockAuditorium),
          },
        },
        {
          provide: getRepositoryToken(Showtime),
          useValue: {
            findOne: jest.fn().mockResolvedValue(mockShowtime),
            find: jest.fn().mockResolvedValue([mockShowtime]),
            save: jest.fn().mockImplementation((st) => Promise.resolve(st)),
            remove: jest.fn().mockResolvedValue(undefined),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ShowtimeSeatPricing),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: getDataSourceToken(),
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
          },
        },
      ],
    }).compile();

    showtimesController = module.get<ShowtimesController>(ShowtimesController);
    movieRepository = module.get(getRepositoryToken(Movie));
    auditoriumRepository = module.get(getRepositoryToken(Auditorium));
    showtimeRepository = module.get(getRepositoryToken(Showtime));
    pricingRepository = module.get(getRepositoryToken(ShowtimeSeatPricing));
  });

  describe('CreateShowtime', () => {
    it('should create showtime without overlapping schedules', async () => {
      const qbMock: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null), // no overlap
      };
      showtimeRepository.createQueryBuilder.mockReturnValue(qbMock);

      const result = await showtimesController.createShowtime({
        movie_id: 'movie-1',
        auditorium_id: 'aud-1',
        start_time: '2026-08-20T18:00:00.000Z',
        end_time: '2026-08-20T20:30:00.000Z',
        experience_type: ExperienceType.IMAX_3D,
        base_price: 150,
        custom_pricings: [
          {
            seat_type: SeatType.VIP,
            price: 200,
          },
        ],
      });

      expect(result.id).toBe('st-1');
      expect(result.base_price).toBe(150);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should reject creation if overlapping showtime exists', async () => {
      const qbMock: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockShowtime), // overlap found
      };
      showtimeRepository.createQueryBuilder.mockReturnValue(qbMock);

      await expect(
        showtimesController.createShowtime({
          movie_id: 'movie-1',
          auditorium_id: 'aud-1',
          start_time: '2026-08-20T18:30:00.000Z',
          end_time: '2026-08-20T21:00:00.000Z',
          base_price: 150,
        }),
      ).rejects.toThrow(RpcException);
    });

    it('should reject creation if start time is after end time', async () => {
      await expect(
        showtimesController.createShowtime({
          movie_id: 'movie-1',
          auditorium_id: 'aud-1',
          start_time: '2026-08-20T21:00:00.000Z',
          end_time: '2026-08-20T18:00:00.000Z',
          base_price: 150,
        }),
      ).rejects.toThrow(RpcException);
    });
  });

  describe('GetShowtimeById', () => {
    it('should return showtime by ID', async () => {
      const qbMock: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockShowtime),
      };
      showtimeRepository.createQueryBuilder.mockReturnValue(qbMock);

      const result = await showtimesController.getShowtimeById({ id: 'st-1' });
      expect(result.id).toBe('st-1');
      expect(result.movie.title).toBe('Inception');
    });
  });

  describe('ListShowtimes', () => {
    it('should list showtimes with filters', async () => {
      const qbMock: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockShowtime], 1]),
      };
      showtimeRepository.createQueryBuilder.mockReturnValue(qbMock);

      const result = await showtimesController.listShowtimes({
        page: 1,
        limit: 10,
        movie_id: 'movie-1',
        date: '2026-08-20',
      });

      expect(result.items.length).toBe(1);
      expect(result.meta.total_items).toBe(1);
    });
  });

  describe('GetShowtimesGroupedByCinema', () => {
    it('should group showtimes by cinema', async () => {
      const qbMock: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockShowtime]),
      };
      showtimeRepository.createQueryBuilder.mockReturnValue(qbMock);

      const result = await showtimesController.getShowtimesGroupedByCinema({
        movie_id: 'movie-1',
        date: '2026-08-20',
        city: 'Cairo',
      });

      expect(result.movie_id).toBe('movie-1');
      expect(result.cinemas.length).toBe(1);
      expect(result.cinemas[0].cinema.name).toBe('Grand Nile Cinema');
    });
  });

  describe('UpdateShowtime and SetShowtimeSeatPricings', () => {
    it('should update showtime status', async () => {
      const result = await showtimesController.updateShowtimeStatus({
        id: 'st-1',
        status: ShowtimeStatus.SELLING,
      });

      expect(result.status).toBe(ShowtimeStatus.SELLING);
    });

    it('should set custom seat pricings in transaction', async () => {
      const result = await showtimesController.setShowtimeSeatPricings({
        showtime_id: 'st-1',
        pricings: [
          {
            seat_type: SeatType.PREMIUM,
            price: 180,
          },
        ],
      });

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });
  });
});
