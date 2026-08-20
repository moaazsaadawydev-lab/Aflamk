import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Auditorium, Seat } from '@booking-ticket-system/Entities';
import { ExperienceType, SeatType } from '@booking-ticket-system/Utils';
import { GenerateSeatLayoutProvider } from '../src/app/seats/providers/generate-layout.provider';
import { GetSeatsProvider } from '../src/app/seats/providers/get-seats.provider';
import { UpdateSeatProvider } from '../src/app/seats/providers/update-seat.provider';
import { SeatsController } from '../src/app/seats/seats.controller';

describe('Seats Domain Suite', () => {
  let seatsController: SeatsController;
  let auditoriumRepository: jest.Mocked<Repository<Auditorium>>;
  let seatRepository: jest.Mocked<Repository<Seat>>;
  let mockQueryRunner: any;

  const mockAuditorium: Auditorium = {
    id: 'aud-1',
    cinemaId: 'cinema-1',
    name: 'Hall 1',
    experienceType: ExperienceType.STANDARD_2D,
    soundSystem: 'Stereo',
    totalRows: 2,
    totalColumns: 2,
    totalSeats: 4,
    isActive: true,
    cinema: null as any,
    seats: [],
    showtimes: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSeat: Seat = {
    id: 'seat-1',
    auditoriumId: 'aud-1',
    rowLabel: 'A',
    seatNumber: 1,
    gridRow: 1,
    gridColumn: 1,
    seatType: SeatType.REGULAR,
    isOperational: true,
    auditorium: null as any,
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
        create: jest.fn().mockImplementation((entity, obj) => ({ ...obj, id: 'seat-new' })),
        save: jest.fn().mockResolvedValue(undefined),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SeatsController],
      providers: [
        GenerateSeatLayoutProvider,
        GetSeatsProvider,
        UpdateSeatProvider,
        {
          provide: getRepositoryToken(Auditorium),
          useValue: {
            findOne: jest.fn().mockResolvedValue(mockAuditorium),
            save: jest.fn().mockResolvedValue(mockAuditorium),
          },
        },
        {
          provide: getRepositoryToken(Seat),
          useValue: {
            findOne: jest.fn().mockResolvedValue(mockSeat),
            find: jest.fn().mockResolvedValue([mockSeat]),
            save: jest.fn().mockImplementation((s) => Promise.resolve(s)),
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

    seatsController = module.get<SeatsController>(SeatsController);
    auditoriumRepository = module.get(getRepositoryToken(Auditorium));
    seatRepository = module.get(getRepositoryToken(Seat));
  });

  describe('GenerateSeatLayout', () => {
    it('should generate seat layout in transactional context', async () => {
      const result = await seatsController.generateSeatLayout({
        auditorium_id: 'aud-1',
        total_rows: 2,
        total_columns: 2,
      });

      expect(result.auditorium_id).toBe('aud-1');
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('GetSeatsByAuditorium', () => {
    it('should return seat matrix for auditorium', async () => {
      const result = await seatsController.getSeatsByAuditorium({
        auditorium_id: 'aud-1',
      });

      expect(result.auditorium_id).toBe('aud-1');
      expect(result.seats.length).toBe(1);
      expect(result.seats[0].row_label).toBe('A');
    });
  });

  describe('UpdateSeat and BatchUpdateSeats', () => {
    it('should update single seat', async () => {
      const result = await seatsController.updateSeat({
        id: 'seat-1',
        seat_type: SeatType.VIP,
        is_operational: false,
      });

      expect(result.seat_type).toBe(SeatType.VIP);
      expect(result.is_operational).toBe(false);
      expect(seatRepository.save).toHaveBeenCalled();
    });

    it('should batch update multiple seats', async () => {
      seatRepository.find.mockResolvedValue([mockSeat]);

      const result = await seatsController.batchUpdateSeats({
        auditorium_id: 'aud-1',
        seats: [
          {
            id: 'seat-1',
            seat_type: SeatType.VIP,
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.updated_count).toBe(1);
    });
  });
});
