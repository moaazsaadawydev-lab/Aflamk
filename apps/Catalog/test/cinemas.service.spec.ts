import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import {
  Auditorium,
  Cinema,
  CinemaAdmin,
  Seat,
  Showtime,
} from '@booking-ticket-system/Entities';
import { ExperienceType } from '@booking-ticket-system/Utils';
import { CreateCinemaProvider } from '../src/app/cinemas/providers/create-cinema.provider';
import { GetCinemaProvider } from '../src/app/cinemas/providers/get-cinema.provider';
import { ListCinemasProvider } from '../src/app/cinemas/providers/list-cinemas.provider';
import { UpdateCinemaProvider } from '../src/app/cinemas/providers/update-cinema.provider';
import { DeleteCinemaProvider } from '../src/app/cinemas/providers/delete-cinema.provider';
import { AuditoriumProvider } from '../src/app/cinemas/providers/auditorium.provider';
import { CinemaAdminProvider } from '../src/app/cinemas/providers/cinema-admin.provider';
import { CinemasController } from '../src/app/cinemas/cinemas.controller';

describe('Cinemas Domain Suite', () => {
  let cinemasController: CinemasController;
  let cinemaRepository: jest.Mocked<Repository<Cinema>>;
  let cinemaAdminRepository: jest.Mocked<Repository<CinemaAdmin>>;
  let auditoriumRepository: jest.Mocked<Repository<Auditorium>>;
  let seatRepository: jest.Mocked<Repository<Seat>>;
  let showtimeRepository: jest.Mocked<Repository<Showtime>>;

  const mockAuditorium: Auditorium = {
    id: 'aud-1',
    cinemaId: 'cinema-1',
    name: 'Hall 1 IMAX',
    experienceType: ExperienceType.IMAX_3D,
    soundSystem: 'Dolby Atmos 7.1',
    totalRows: 5,
    totalColumns: 10,
    totalSeats: 50,
    isActive: true,
    cinema: null as any,
    seats: [],
    showtimes: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCinema: Cinema = {
    id: 'cinema-1',
    name: 'Grand Nile Cinema',
    slug: 'grand-nile-cinema',
    description: 'Premier theater',
    city: 'Cairo',
    address: 'Nile Corniche, Garden City',
    latitude: 30.0444,
    longitude: 31.2357,
    phoneNumber: '+201001234567',
    facilities: ['Parking', 'VIP Lounge', 'Wheelchair Access'],
    thumbnailUrl: 'http://localhost:9000/media/thumb.jpg',
    galleryUrls: ['http://localhost:9000/media/g1.jpg'],
    isActive: true,
    auditoriums: [mockAuditorium],
    admins: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockQueryRunner: any = {
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    manager: {
      create: jest.fn().mockImplementation((entity, dto) => ({ ...dto, id: 'cinema-1' })),
      save: jest.fn().mockImplementation((entity, obj) => Promise.resolve(obj)),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CinemasController],
      providers: [
        CreateCinemaProvider,
        GetCinemaProvider,
        ListCinemasProvider,
        UpdateCinemaProvider,
        DeleteCinemaProvider,
        AuditoriumProvider,
        CinemaAdminProvider,
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
          },
        },
        {
          provide: getRepositoryToken(Cinema),
          useValue: {
            create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 'cinema-1' })),
            save: jest.fn().mockImplementation((c) => Promise.resolve({ ...c, id: c.id || 'cinema-1' })),
            findOne: jest.fn(),
            find: jest.fn(),
            softRemove: jest.fn().mockResolvedValue(undefined),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(CinemaAdmin),
          useValue: {
            create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 'admin-1' })),
            save: jest.fn().mockImplementation((a) => Promise.resolve({ ...a, id: a.id || 'admin-1' })),
            findOne: jest.fn(),
            find: jest.fn().mockResolvedValue([]),
            delete: jest.fn().mockResolvedValue({ affected: 1 }),
          },
        },
        {
          provide: getRepositoryToken(Auditorium),
          useValue: {
            create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 'aud-1' })),
            save: jest.fn().mockImplementation((a) => Promise.resolve({ ...a, id: a.id || 'aud-1' })),
            findOne: jest.fn(),
            find: jest.fn(),
            softRemove: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: getRepositoryToken(Seat),
          useValue: {
            create: jest.fn().mockImplementation((s) => ({ ...s, id: 'seat-1' })),
            save: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: getRepositoryToken(Showtime),
          useValue: {
            count: jest.fn().mockResolvedValue(0),
            createQueryBuilder: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnThis(),
              getCount: jest.fn().mockResolvedValue(0),
            }),
          },
        },
      ],
    }).compile();

    cinemasController = module.get<CinemasController>(CinemasController);
    cinemaRepository = module.get(getRepositoryToken(Cinema));
    cinemaAdminRepository = module.get(getRepositoryToken(CinemaAdmin));
    auditoriumRepository = module.get(getRepositoryToken(Auditorium));
    seatRepository = module.get(getRepositoryToken(Seat));
    showtimeRepository = module.get(getRepositoryToken(Showtime));
  });

  describe('CreateCinema', () => {
    it('should create cinema and format response', async () => {
      cinemaRepository.findOne.mockResolvedValue(mockCinema);

      const result = await cinemasController.createCinema({
        name: 'Grand Nile Cinema',
        city: 'Cairo',
        address: 'Nile Corniche',
      });

      expect(result.name).toBe('Grand Nile Cinema');
      expect(result.slug).toBe('grand-nile-cinema');
      expect(mockQueryRunner.manager.save).toHaveBeenCalled();
    });
  });

  describe('GetCinemaById and GetCinemaBySlug', () => {
    it('should return cinema by ID', async () => {
      cinemaRepository.findOne.mockResolvedValue(mockCinema);

      const result = await cinemasController.getCinemaById({ id: 'cinema-1' });
      expect(result.id).toBe('cinema-1');
      expect(result.name).toBe('Grand Nile Cinema');
    });

    it('should return cinema by slug', async () => {
      cinemaRepository.findOne.mockResolvedValue(mockCinema);

      const result = await cinemasController.getCinemaBySlug({ slug: 'grand-nile-cinema' });
      expect(result.slug).toBe('grand-nile-cinema');
    });

    it('should throw NOT_FOUND if cinema is missing', async () => {
      cinemaRepository.findOne.mockResolvedValue(null);

      await expect(cinemasController.getCinemaById({ id: 'missing' })).rejects.toThrow(
        RpcException,
      );
    });
  });

  describe('ListCinemas', () => {
    it('should list cinemas with city and search filters', async () => {
      const qbMock: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockCinema], 1]),
      };
      cinemaRepository.createQueryBuilder.mockReturnValue(qbMock);

      const result = await cinemasController.listCinemas({
        city: 'Cairo',
        page: 1,
        limit: 10,
      });

      expect(result.items.length).toBe(1);
      expect(result.meta.total_items).toBe(1);
    });
  });

  describe('UpdateCinema', () => {
    it('should update cinema details', async () => {
      cinemaRepository.findOne.mockResolvedValue({ ...mockCinema });

      const result = await cinemasController.updateCinema({
        id: 'cinema-1',
        name: 'Grand Nile Luxury Cinema',
        city: 'Cairo',
      });

      expect(result.name).toBe('Grand Nile Luxury Cinema');
      expect(cinemaRepository.save).toHaveBeenCalled();
    });
  });

  describe('DeleteCinema', () => {
    it('should soft-delete cinema when no active showtimes exist', async () => {
      cinemaRepository.findOne.mockResolvedValue(mockCinema);

      const result = await cinemasController.deleteCinema({ id: 'cinema-1' });
      expect(result.success).toBe(true);
      expect(cinemaRepository.softRemove).toHaveBeenCalled();
    });
  });

  describe('Cinema Admin Operations', () => {
    it('should assign a cinema admin', async () => {
      cinemaRepository.findOne.mockResolvedValue(mockCinema);
      cinemaAdminRepository.findOne.mockResolvedValue(null);

      const result = await cinemasController.assignCinemaAdmin({
        cinema_id: 'cinema-1',
        user_id: 'user-123',
      });

      expect(result.cinema_id).toBe('cinema-1');
      expect(result.user_id).toBe('user-123');
      expect(cinemaAdminRepository.save).toHaveBeenCalled();
    });

    it('should remove a cinema admin', async () => {
      const result = await cinemasController.removeCinemaAdmin({
        cinema_id: 'cinema-1',
        user_id: 'user-123',
      });

      expect(result.success).toBe(true);
      expect(cinemaAdminRepository.delete).toHaveBeenCalledWith({
        cinemaId: 'cinema-1',
        userId: 'user-123',
      });
    });

    it('should get all cinema admins', async () => {
      cinemaAdminRepository.find.mockResolvedValue([
        { id: 'admin-1', cinemaId: 'cinema-1', userId: 'user-123', createdAt: new Date() } as CinemaAdmin,
      ]);

      const result = await cinemasController.getCinemaAdmins({
        cinema_id: 'cinema-1',
      });

      expect(result.admin_user_ids).toEqual(['user-123']);
    });
  });

  describe('Auditorium Operations', () => {
    it('should create auditorium and auto-generate 50 seats for 5x10 grid', async () => {
      cinemaRepository.findOne.mockResolvedValue(mockCinema);

      const result = await cinemasController.createAuditorium({
        cinema_id: 'cinema-1',
        name: 'Hall 1 IMAX',
        experience_type: ExperienceType.IMAX_3D,
        total_rows: 5,
        total_columns: 10,
      });

      expect(result.name).toBe('Hall 1 IMAX');
      expect(result.total_seats).toBe(50);
      expect(seatRepository.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ rowLabel: 'A', seatNumber: 1 }),
          expect.objectContaining({ rowLabel: 'E', seatNumber: 10 }),
        ]),
      );
    });

    it('should list auditoriums by cinema', async () => {
      auditoriumRepository.find.mockResolvedValue([mockAuditorium]);

      const result = await cinemasController.listAuditoriumsByCinema({
        cinema_id: 'cinema-1',
      });

      expect(result.items.length).toBe(1);
      expect(result.items[0].name).toBe('Hall 1 IMAX');
    });

    it('should update auditorium', async () => {
      auditoriumRepository.findOne.mockResolvedValue({ ...mockAuditorium });

      const result = await cinemasController.updateAuditorium({
        id: 'aud-1',
        name: 'Hall 1 IMAX 4K',
      });

      expect(result.name).toBe('Hall 1 IMAX 4K');
    });

    it('should soft-delete auditorium when no showtimes exist', async () => {
      auditoriumRepository.findOne.mockResolvedValue(mockAuditorium);
      showtimeRepository.count.mockResolvedValue(0);

      const result = await cinemasController.deleteAuditorium({ id: 'aud-1' });
      expect(result.success).toBe(true);
      expect(auditoriumRepository.softRemove).toHaveBeenCalled();
    });
  });
});
