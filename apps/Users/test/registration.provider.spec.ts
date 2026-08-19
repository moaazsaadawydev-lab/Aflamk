import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { Users, OutboxMessage } from '@booking-ticket-system/Entities';
import { RedisService } from '@booking-ticket-system/Redis';
import { UserGender, Country, UserStatus } from '@booking-ticket-system/Utils';
import { UserOutboxEvent } from '@booking-ticket-system/Constants';
import { RegistrationProvider } from '../src/app/Users/Providers/registration.provider';
import { OutboxPublisherService } from '../src/app/outbox/outbox-publisher.service';

describe('RegistrationProvider', () => {
  let provider: RegistrationProvider;
  let userRepository: jest.Mocked<Repository<Users>>;
  let dataSource: jest.Mocked<DataSource>;
  let outboxService: jest.Mocked<OutboxPublisherService>;
  let redisService: jest.Mocked<RedisService>;

  let mockQueryRunner: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockQueryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {
        create: jest.fn().mockImplementation((entity, data) => ({ ...data })),
        save: jest.fn().mockImplementation((data) => Promise.resolve(data)),
      },
    };

    const mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    const mockUserRepository = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((u) => Promise.resolve(u)),
    };

    const mockOutboxService = {
      publishPendingMessages: jest.fn().mockResolvedValue(undefined),
    };

    const mockRedisService = {
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn(),
      del: jest.fn().mockResolvedValue(1),
      incrementCounter: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationProvider,
        {
          provide: getDataSourceToken(),
          useValue: mockDataSource,
        },
        {
          provide: getRepositoryToken(Users),
          useValue: mockUserRepository,
        },
        {
          provide: OutboxPublisherService,
          useValue: mockOutboxService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    provider = module.get<RegistrationProvider>(RegistrationProvider);
    userRepository = module.get(getRepositoryToken(Users));
    dataSource = module.get(getDataSourceToken());
    outboxService = module.get(OutboxPublisherService);
    redisService = module.get(RedisService);
  });

  describe('register', () => {
    it('should throw ALREADY_EXISTS when email is already registered', async () => {
      userRepository.findOne.mockResolvedValue({ id: 'existing-user' } as Users);

      await expect(
        provider.register({
          email: 'duplicate@example.com',
          password: 'Password@123',
          name: 'Duplicate User',
        }),
      ).rejects.toThrow(RpcException);

      try {
        await provider.register({
          email: 'duplicate@example.com',
          password: 'Password@123',
        });
      } catch (err: any) {
        expect(err.error.code).toBe(status.ALREADY_EXISTS);
      }
    });

    it('should create user, outbox events, store OTP in Redis, and commit transaction', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await provider.register({
        email: 'newuser@example.com',
        name: 'New User',
        password: 'SecurePassword@123',
        gender: UserGender.MALE,
        country: Country.EGYPT,
        birthDate: '1998-01-01',
      });

      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.manager.save).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(redisService.set).toHaveBeenCalledWith(
        expect.stringMatching(/^otp:verify-email:newuser@example\.com$/),
        expect.any(String),
        expect.any(Number),
      );
      expect(result).toHaveProperty('message', 'Account created successfully');
      expect(result.user.email).toBe('newuser@example.com');
      expect(result.user.status).toBe(UserStatus.UNVERIFIED);
    });

    it('should save PROCESS_PROFILE_PHOTO outbox event when tempObjectKey and crop params are provided', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await provider.register({
        email: 'cropuser@example.com',
        name: 'Crop User',
        password: 'Password@123',
        tempObjectKey: 'temp/raw-avatar-123.raw',
        cropX: 10,
        cropY: 20,
        cropWidth: 200,
        cropHeight: 200,
        cropZoom: 1.5,
      });

      const savedOutboxCalls = mockQueryRunner.manager.save.mock.calls;
      const photoOutboxCall = savedOutboxCalls.find(
        (call: any[]) => call[0]?.eventType === UserOutboxEvent.PROCESS_PROFILE_PHOTO,
      );

      expect(photoOutboxCall).toBeDefined();
      expect(photoOutboxCall[0].payload.cropX).toBe(10);
      expect(photoOutboxCall[0].payload.cropZoom).toBe(1.5);
    });

    it('should rollback transaction and release connection on error', async () => {
      userRepository.findOne.mockResolvedValue(null);
      mockQueryRunner.manager.save.mockRejectedValueOnce(new Error('DB failure'));

      await expect(
        provider.register({
          email: 'erroruser@example.com',
          password: 'Password@123',
        }),
      ).rejects.toThrow('DB failure');

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('verifyEmail', () => {
    it('should throw NOT_FOUND when user does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        provider.verifyEmail({ email: 'ghost@example.com', code: '123456' }),
      ).rejects.toThrow(RpcException);
    });

    it('should throw FAILED_PRECONDITION when user is already active', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 'u1',
        email: 'active@example.com',
        status: UserStatus.ACTIVE,
      } as Users);

      await expect(
        provider.verifyEmail({ email: 'active@example.com', code: '123456' }),
      ).rejects.toThrow(RpcException);
    });

    it('should lock out user and delete OTP when brute-force attempts exceed MAX_OTP_ATTEMPTS (5)', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 'u2',
        email: 'brute@example.com',
        status: UserStatus.UNVERIFIED,
      } as Users);

      redisService.incrementCounter.mockResolvedValue(6);

      await expect(
        provider.verifyEmail({ email: 'brute@example.com', code: '999999' }),
      ).rejects.toThrow(RpcException);

      expect(redisService.del).toHaveBeenCalledWith('otp:verify-email:brute@example.com');
    });

    it('should throw INVALID_ARGUMENT when OTP does not match or has expired', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 'u3',
        email: 'test@example.com',
        status: UserStatus.UNVERIFIED,
      } as Users);

      redisService.incrementCounter.mockResolvedValue(1);
      redisService.get.mockResolvedValue('123456');

      await expect(
        provider.verifyEmail({ email: 'test@example.com', code: '654321' }),
      ).rejects.toThrow(RpcException);
    });

    it('should activate user and clean up Redis keys when OTP is valid', async () => {
      const mockUser = {
        id: 'u4',
        email: 'verify-success@example.com',
        status: UserStatus.UNVERIFIED,
      } as Users;

      userRepository.findOne.mockResolvedValue(mockUser);
      redisService.incrementCounter.mockResolvedValue(1);
      redisService.get.mockResolvedValue('654321');

      const result = await provider.verifyEmail({
        email: 'verify-success@example.com',
        code: '654321',
      });

      expect(mockUser.status).toBe(UserStatus.ACTIVE);
      expect(userRepository.save).toHaveBeenCalledWith(mockUser);
      expect(redisService.del).toHaveBeenCalledWith('otp:verify-email:verify-success@example.com');
      expect(result).toEqual({ message: 'Email verified successfully' });
    });
  });
});
