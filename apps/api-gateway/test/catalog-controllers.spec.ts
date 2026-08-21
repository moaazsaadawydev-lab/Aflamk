import { Test, TestingModule } from '@nestjs/testing';
import {
  CatalogMoviesController,
  CatalogCinemasController,
  CatalogSeatsController,
  CatalogShowtimesController,
} from '../src/app/api-gateway-service/Controllers/Catalog';
import {
  CatalogProvider,
  UserProfileProvider,
} from '../src/app/api-gateway-service/providers';
import { JwtAuthGuard, RolesGuard } from '@booking-ticket-system/Guards';
import {
  CreateCinemaDto,
  CreateMovieDto,
  CreateShowtimeDto,
} from '@booking-ticket-system/DTOs';
import {
  ExperienceType,
  MovieAgeRating,
  MovieStatus,
  SeatType,
  ShowtimeStatus,
  UserRole,
} from '@booking-ticket-system/Utils';
import { Users } from '@booking-ticket-system/Entities';

describe('API Gateway Catalog Controllers Suite', () => {
  let moviesController: CatalogMoviesController;
  let cinemasController: CatalogCinemasController;
  let seatsController: CatalogSeatsController;
  let showtimesController: CatalogShowtimesController;
  let catalogProvider: jest.Mocked<CatalogProvider>;
  let userProfileProvider: jest.Mocked<UserProfileProvider>;

  const mockCatalogProvider = {
    createMovie: jest.fn(),
    getMovieById: jest.fn(),
    getMovieBySlug: jest.fn(),
    listMovies: jest.fn(),
    updateMovie: jest.fn(),
    deleteMovie: jest.fn(),
    listGenres: jest.fn(),
    createCinema: jest.fn(),
    getCinemaById: jest.fn(),
    getCinemaBySlug: jest.fn(),
    listCinemas: jest.fn(),
    updateCinema: jest.fn(),
    deleteCinema: jest.fn(),
    createAuditorium: jest.fn(),
    getAuditoriumById: jest.fn(),
    listAuditoriumsByCinema: jest.fn(),
    updateAuditorium: jest.fn(),
    deleteAuditorium: jest.fn(),
    assignCinemaAdmin: jest.fn(),
    removeCinemaAdmin: jest.fn(),
    getCinemaAdmins: jest.fn(),
    generateSeatLayout: jest.fn(),
    getSeatsByAuditorium: jest.fn(),
    updateSeat: jest.fn(),
    batchUpdateSeats: jest.fn(),
    createShowtime: jest.fn(),
    getShowtimeById: jest.fn(),
    listShowtimes: jest.fn(),
    getShowtimesGroupedByCinema: jest.fn(),
    updateShowtime: jest.fn(),
    updateShowtimeStatus: jest.fn(),
    deleteShowtime: jest.fn(),
    setShowtimeSeatPricings: jest.fn(),
  };

  const mockUserProfileProvider = {
    getUserById: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [
        CatalogMoviesController,
        CatalogCinemasController,
        CatalogSeatsController,
        CatalogShowtimesController,
      ],
      providers: [
        {
          provide: CatalogProvider,
          useValue: mockCatalogProvider,
        },
        {
          provide: UserProfileProvider,
          useValue: mockUserProfileProvider,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    moviesController = module.get<CatalogMoviesController>(CatalogMoviesController);
    cinemasController = module.get<CatalogCinemasController>(CatalogCinemasController);
    seatsController = module.get<CatalogSeatsController>(CatalogSeatsController);
    showtimesController = module.get<CatalogShowtimesController>(CatalogShowtimesController);
    catalogProvider = module.get(CatalogProvider);
    userProfileProvider = module.get(UserProfileProvider);
  });

  describe('CatalogMoviesController', () => {
    it('should forward createMovie to provider', async () => {
      const dto: CreateMovieDto = {
        title: 'Interstellar',
        description: 'Space journey',
        durationMinutes: 169,
        releaseDate: '2014-11-07',
        ageRating: MovieAgeRating.PG_13,
        status: MovieStatus.NOW_SHOWING,
        originalLanguage: 'en',
        directors: ['Christopher Nolan'],
        cast: ['Matthew McConaughey'],
      };
      mockCatalogProvider.createMovie.mockResolvedValue({ id: 'movie-1', ...dto });

      const result: any = await moviesController.createMovie(dto);
      expect(result.id).toBe('movie-1');
      expect(catalogProvider.createMovie).toHaveBeenCalledWith(dto);
    });

    it('should forward listMovies to provider', async () => {
      mockCatalogProvider.listMovies.mockResolvedValue({ items: [], meta: {} });
      const query = { page: 1, limit: 10 };
      await moviesController.listMovies(query);
      expect(catalogProvider.listMovies).toHaveBeenCalledWith(query);
    });
  });

  describe('CatalogCinemasController', () => {
    it('should forward createCinema to provider', async () => {
      const dto: CreateCinemaDto = {
        name: 'IMAX Cinema',
        city: 'Cairo',
        address: '6th October City',
      };
      mockCatalogProvider.createCinema.mockResolvedValue({ id: 'cinema-1', ...dto });

      const result: any = await cinemasController.createCinema(dto);
      expect(result.id).toBe('cinema-1');
      expect(catalogProvider.createCinema).toHaveBeenCalledWith(dto);
    });

    it('should forward createAuditorium to provider with cinemaId', async () => {
      const dto = {
        name: 'Screen 1',
        experienceType: ExperienceType.IMAX_3D,
        totalRows: 10,
        totalColumns: 20,
      };
      mockCatalogProvider.createAuditorium.mockResolvedValue({ id: 'aud-1', ...dto });

      await cinemasController.createAuditorium('cinema-1', dto, { id: 'admin-1', role: UserRole.ADMIN } as Users);
      expect(catalogProvider.createAuditorium).toHaveBeenCalledWith({
        ...dto,
        cinemaId: 'cinema-1',
      });
    });

    it('should validate role and assign cinema admin', async () => {
      mockUserProfileProvider.getUserById.mockResolvedValue({
        id: 'user-123',
        role: UserRole.CINEMA_ADMIN,
      });
      mockCatalogProvider.assignCinemaAdmin.mockResolvedValue({
        id: 'admin-link-1',
        cinema_id: 'cinema-1',
        user_id: 'user-123',
      });

      const result: any = await cinemasController.assignCinemaAdmin('cinema-1', {
        userId: 'user-123',
      });

      expect(userProfileProvider.getUserById).toHaveBeenCalledWith('user-123');
      expect(catalogProvider.assignCinemaAdmin).toHaveBeenCalledWith('cinema-1', 'user-123');
      expect(result.cinema_id).toBe('cinema-1');
    });

    it('should remove cinema admin', async () => {
      mockCatalogProvider.removeCinemaAdmin.mockResolvedValue({
        success: true,
        message: 'Admin removed successfully',
      });

      const result: any = await cinemasController.removeCinemaAdmin('cinema-1', 'user-123');
      expect(catalogProvider.removeCinemaAdmin).toHaveBeenCalledWith('cinema-1', 'user-123');
      expect(result.success).toBe(true);
    });

    it('should get cinema admins for admin user', async () => {
      mockCatalogProvider.getCinemaAdmins.mockResolvedValue({
        admin_user_ids: ['user-123'],
      });

      const result: any = await cinemasController.getCinemaAdmins('cinema-1', {
        id: 'super-admin',
        role: UserRole.SUPER_ADMIN,
      } as Users);

      expect(result.admin_user_ids).toEqual(['user-123']);
    });
  });

  describe('CatalogSeatsController', () => {
    it('should forward generateSeatLayout to provider', async () => {
      const dto = {
        auditoriumId: 'aud-1',
        totalRows: 10,
        totalColumns: 10,
      };
      mockCatalogProvider.generateSeatLayout.mockResolvedValue({ success: true });

      await seatsController.generateSeatLayout(dto);
      expect(catalogProvider.generateSeatLayout).toHaveBeenCalledWith(dto);
    });

    it('should forward updateSeat to provider', async () => {
      const dto = { seatType: SeatType.VIP };
      mockCatalogProvider.updateSeat.mockResolvedValue({ id: 'seat-1', ...dto });

      await seatsController.updateSeat('seat-1', dto);
      expect(catalogProvider.updateSeat).toHaveBeenCalledWith('seat-1', dto);
    });
  });

  describe('CatalogShowtimesController', () => {
    it('should forward createShowtime to provider', async () => {
      const dto: CreateShowtimeDto = {
        movieId: 'movie-1',
        auditoriumId: 'aud-1',
        startTime: '2026-08-20T18:00:00.000Z',
        endTime: '2026-08-20T20:00:00.000Z',
        experienceType: ExperienceType.STANDARD_2D,
        basePrice: 120,
      };
      mockCatalogProvider.createShowtime.mockResolvedValue({ id: 'st-1', ...dto });

      await showtimesController.createShowtime(dto);
      expect(catalogProvider.createShowtime).toHaveBeenCalledWith(dto);
    });

    it('should forward updateShowtimeStatus to provider', async () => {
      mockCatalogProvider.updateShowtimeStatus.mockResolvedValue({
        id: 'st-1',
        status: ShowtimeStatus.SELLING,
      });

      await showtimesController.updateShowtimeStatus('st-1', ShowtimeStatus.SELLING);
      expect(catalogProvider.updateShowtimeStatus).toHaveBeenCalledWith(
        'st-1',
        ShowtimeStatus.SELLING,
      );
    });
  });
});
