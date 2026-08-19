import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { Users, OutboxMessage } from '@booking-ticket-system/Entities';
import { RedisService } from '@booking-ticket-system/Redis';
import { UserStatus } from '@booking-ticket-system/Utils';
import { UpdateUserStatusProvider } from '../src/app/Users/Providers/admin/update-user-status.provider';
import { ProfileProvider } from '../src/app/Users/Providers/profile.provider';
import { UpdateUserProvider } from '../src/app/Users/Providers/UpdateUser.provider';
import { ResendVerificationCodeProvider } from '../src/app/Users/Providers/verification/resend-verification-code.provider';
import { LogoutProvider } from '../src/app/Users/Providers/auth/logout.provider';
import { OutboxPublisherService } from '../src/app/outbox/outbox-publisher.service';

describe('Admin, Profile, and Verification Providers Suite', () => {
  let updateUserStatusProvider: UpdateUserStatusProvider;
  let profileProvider: ProfileProvider;
  let updateUserProvider: UpdateUserProvider;
  let resendVerificationCodeProvider: ResendVerificationCodeProvider;
  let logoutProvider: LogoutProvider;
  let userRepository: jest.Mocked<Repository<Users>>;
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
        findOne: jest.fn(),
        create: jest.fn().mockImplementation((entity, data) => ({ ...data })),
        save: jest.fn().mockImplementation((data) => Promise.resolve(data)),
      },
    };

    const mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
      getRepository: jest.fn().mockReturnValue({
        create: jest.fn().mockImplementation((d) => ({ ...d })),
        save: jest.fn().mockResolvedValue(undefined),
      }),
    };

    const mockUserRepository = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((u) => Promise.resolve(u)),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const mockRedisService = {
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn(),
      del: jest.fn().mockResolvedValue(1),
      srem: jest.fn().mockResolvedValue(1),
      exists: jest.fn().mockResolvedValue(false),
      revokeAllUserSessions: jest.fn().mockResolvedValue(undefined),
      revokeUserSession: jest.fn().mockResolvedValue(undefined),
    };

    const mockOutboxService = {
      publishPendingMessages: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateUserStatusProvider,
        ProfileProvider,
        UpdateUserProvider,
        ResendVerificationCodeProvider,
        LogoutProvider,
        {
          provide: getDataSourceToken(),
          useValue: mockDataSource,
        },
        {
          provide: getRepositoryToken(Users),
          useValue: mockUserRepository,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: OutboxPublisherService,
          useValue: mockOutboxService,
        },
      ],
    }).compile();

    updateUserStatusProvider = module.get(UpdateUserStatusProvider);
    profileProvider = module.get(ProfileProvider);
    updateUserProvider = module.get(UpdateUserProvider);
    resendVerificationCodeProvider = module.get(ResendVerificationCodeProvider);
    logoutProvider = module.get(LogoutProvider);
    userRepository = module.get(getRepositoryToken(Users));
    redisService = module.get(RedisService);
  });

  describe('UpdateUserStatusProvider', () => {
    it('should update user to SUSPENDED with duration and purge all active sessions', async () => {
      const user = {
        id: 'usr-target',
        status: UserStatus.ACTIVE,
      } as Users;

      userRepository.findOne.mockResolvedValue(user);

      const result = await updateUserStatusProvider.execute({
        targetUserId: 'usr-target',
        status: UserStatus.SUSPENDED,
        reason: 'Policy violation',
        suspendedUntil: '2026-12-31T23:59:59.000Z',
      });

      expect(user.status).toBe(UserStatus.SUSPENDED);
      expect(user.statusReason).toBe('Policy violation');
      expect(user.suspendedUntil).toEqual(new Date('2026-12-31T23:59:59.000Z'));
      expect(redisService.revokeAllUserSessions).toHaveBeenCalledWith('usr-target');
      expect(result.status).toBe(UserStatus.SUSPENDED);
    });

    it('should update user to ACTIVE and clear reason and suspension date', async () => {
      const user = {
        id: 'usr-target',
        status: UserStatus.SUSPENDED,
        statusReason: 'Previous issue',
        suspendedUntil: new Date(),
      } as Users;

      userRepository.findOne.mockResolvedValue(user);

      const result = await updateUserStatusProvider.execute({
        targetUserId: 'usr-target',
        status: UserStatus.ACTIVE,
      });

      expect(user.status).toBe(UserStatus.ACTIVE);
      expect(user.statusReason).toBeNull();
      expect(user.suspendedUntil).toBeNull();
      expect(result.status).toBe(UserStatus.ACTIVE);
    });
  });

  describe('ProfileProvider & UpdateUserProvider', () => {
    it('should retrieve user profile or throw NOT_FOUND', async () => {
      userRepository.findOne.mockResolvedValueOnce(null);
      await expect(profileProvider.getProfile('unknown')).rejects.toThrow(RpcException);

      const mockUser = { id: 'usr-1', email: 'test@example.com' } as Users;
      userRepository.findOne.mockResolvedValueOnce(mockUser);
      await expect(profileProvider.getProfile('usr-1')).resolves.toEqual(mockUser);
    });

    it('should update user profile and trigger photo processing outbox message', async () => {
      const user = {
        id: 'usr-profile',
        name: 'Old Name',
        avatarKey: 'avatars/old.webp',
      } as Users;

      mockQueryRunner.manager.findOne.mockResolvedValue(user);

      const updated = await updateUserProvider.execute('usr-profile', {
        name: 'New Name',
        tempKey: 'temp/avatar-crop.raw',
        cropX: 10,
        cropY: 15,
        cropWidth: 100,
        cropHeight: 100,
        cropZoom: 1.0,
      });

      expect(updated.name).toBe('New Name');
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });
  });

  describe('ResendVerificationCodeProvider', () => {
    it('should reject resend for already active account', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 'usr-active',
        email: 'active@example.com',
        status: UserStatus.ACTIVE,
      } as Users);

      await expect(
        resendVerificationCodeProvider.execute({ email: 'active@example.com' }),
      ).rejects.toThrow(RpcException);
    });

    it('should generate fresh OTP and save outbox event for unverified account', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 'usr-unverified',
        email: 'unverified@example.com',
        status: UserStatus.UNVERIFIED,
      } as Users);

      const result = await resendVerificationCodeProvider.execute({
        email: 'unverified@example.com',
      });

      expect(redisService.set).toHaveBeenCalledWith(
        'otp:verify-email:unverified@example.com',
        expect.any(String),
        expect.any(Number),
      );
      expect(result.success).toBe(true);
    });
  });

  describe('LogoutProvider', () => {
    it('should revoke user session in Redis when sessionId is provided', async () => {
      const result = await logoutProvider.execute({
        userId: 'usr-1',
        sessionId: 'sess-abc',
      });

      expect(redisService.revokeUserSession).toHaveBeenCalledWith('usr-1', 'sess-abc');
      expect(result.success).toBe(true);
    });
  });
});
