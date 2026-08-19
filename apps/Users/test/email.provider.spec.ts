import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { Users, OutboxMessage, UserEmailHistory } from '@booking-ticket-system/Entities';
import { RedisService } from '@booking-ticket-system/Redis';
import { AuthProviderType, UserStatus } from '@booking-ticket-system/Utils';
import { RequestChangeEmailProvider } from '../src/app/Users/Providers/email/request-change-email.provider';
import { ConfirmChangeEmailProvider } from '../src/app/Users/Providers/email/confirm-change-email.provider';
import { FreezeAccountProvider } from '../src/app/Users/Providers/email/freeze-account.provider';
import { RollbackEmailProvider } from '../src/app/Users/Providers/email/rollback-email.provider';
import { OutboxPublisherService } from '../src/app/outbox/outbox-publisher.service';

describe('Email Providers Suite', () => {
  let requestChangeEmailProvider: RequestChangeEmailProvider;
  let confirmChangeEmailProvider: ConfirmChangeEmailProvider;
  let freezeAccountProvider: FreezeAccountProvider;
  let rollbackEmailProvider: RollbackEmailProvider;
  let userRepository: jest.Mocked<Repository<Users>>;
  let redisService: jest.Mocked<RedisService>;
  let outboxService: jest.Mocked<OutboxPublisherService>;

  let mockQueryRunner: any;
  let mockHistoryRepo: any;

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

    mockHistoryRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((d) => ({ ...d })),
      save: jest.fn().mockImplementation((d) => Promise.resolve(d)),
    };

    const mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
      getRepository: jest.fn((entity) => {
        if (entity === UserEmailHistory) return mockHistoryRepo;
        return {
          create: jest.fn().mockImplementation((d) => ({ ...d })),
          save: jest.fn().mockResolvedValue(undefined),
        };
      }),
    };

    const mockUserRepository = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((u) => Promise.resolve(u)),
    };

    const mockRedisService = {
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn(),
      del: jest.fn().mockResolvedValue(1),
      exists: jest.fn().mockResolvedValue(false),
      incrementCounter: jest.fn().mockResolvedValue(1),
      revokeAllUserSessions: jest.fn().mockResolvedValue(undefined),
    };

    const mockOutboxService = {
      publishPendingMessages: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestChangeEmailProvider,
        ConfirmChangeEmailProvider,
        FreezeAccountProvider,
        RollbackEmailProvider,
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

    requestChangeEmailProvider = module.get(RequestChangeEmailProvider);
    confirmChangeEmailProvider = module.get(ConfirmChangeEmailProvider);
    freezeAccountProvider = module.get(FreezeAccountProvider);
    rollbackEmailProvider = module.get(RollbackEmailProvider);
    userRepository = module.get(getRepositoryToken(Users));
    redisService = module.get(RedisService);
    outboxService = module.get(OutboxPublisherService);
  });

  describe('RequestChangeEmailProvider', () => {
    it('should reject when account freeze is active', async () => {
      redisService.exists.mockResolvedValueOnce(true); // freeze active

      await expect(
        requestChangeEmailProvider.execute({
          userId: 'usr-frozen',
          newEmail: 'new@example.com',
        }),
      ).rejects.toThrow(RpcException);
    });

    it('should reject when new email is identical to current email', async () => {
      const user = {
        id: 'usr-1',
        email: 'current@example.com',
        password: null,
      } as unknown as Users;

      userRepository.findOne.mockResolvedValueOnce(user);

      await expect(
        requestChangeEmailProvider.execute({
          userId: 'usr-1',
          newEmail: 'current@example.com',
        }),
      ).rejects.toThrow(RpcException);
    });

    it('should generate OTP and emergency freeze token on valid request', async () => {
      const currentHashed = await bcrypt.hash('CorrectPass@123', 10);
      const user = {
        id: 'usr-1',
        email: 'old@example.com',
        password: currentHashed,
        name: 'John Doe',
      } as Users;

      userRepository.findOne
        .mockResolvedValueOnce(user) // user lookup
        .mockResolvedValueOnce(null); // new email unique check

      const result = await requestChangeEmailProvider.execute({
        userId: 'usr-1',
        currentPassword: 'CorrectPass@123',
        newEmail: 'brandnew@example.com',
      });

      expect(redisService.set).toHaveBeenCalledWith(
        'otp:change-email:usr-1',
        expect.objectContaining({ newEmail: 'brandnew@example.com' }),
        expect.any(Number),
      );
      expect(result.success).toBe(true);
    });
  });

  describe('ConfirmChangeEmailProvider', () => {
    it('should lock out user for 15 minutes when brute-force attempts exceed MAX_OTP_ATTEMPTS', async () => {
      redisService.exists.mockResolvedValue(false);
      redisService.get.mockResolvedValue({ code: '123456', newEmail: 'new@example.com' });
      redisService.incrementCounter.mockResolvedValue(6);

      await expect(
        confirmChangeEmailProvider.execute({
          userId: 'usr-brute',
          code: '999999',
        }),
      ).rejects.toThrow(RpcException);

      expect(redisService.set).toHaveBeenCalledWith(
        'lock:change-email-attempts:usr-brute',
        'locked',
        expect.any(Number),
      );
    });

    it('should update email, unlink googleId, create rollback history token and revoke all sessions', async () => {
      redisService.exists.mockResolvedValue(false);
      redisService.get.mockResolvedValue({ code: '654321', newEmail: 'confirmed@example.com' });

      const user = {
        id: 'usr-confirmed',
        email: 'old@example.com',
        googleId: 'gid-12345',
        provider: AuthProviderType.GOOGLE,
        status: UserStatus.ACTIVE,
      } as Users;

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(user) // current user
        .mockResolvedValueOnce(null); // email conflict check

      const result = await confirmChangeEmailProvider.execute({
        userId: 'usr-confirmed',
        code: '654321',
      });

      expect(user.email).toBe('confirmed@example.com');
      expect(user.googleId).toBeNull();
      expect(user.provider).toBe(AuthProviderType.LOCAL);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(redisService.revokeAllUserSessions).toHaveBeenCalledWith('usr-confirmed');
      expect(result.success).toBe(true);
    });
  });

  describe('FreezeAccountProvider', () => {
    it('should reject invalid or expired freeze tokens', async () => {
      redisService.get.mockResolvedValue(null);

      await expect(
        freezeAccountProvider.execute('invalid-token-123'),
      ).rejects.toThrow(RpcException);
    });

    it('should execute 24-hour security lockout and purge all active sessions', async () => {
      redisService.get.mockResolvedValue({ userId: 'usr-victim' });

      const result = await freezeAccountProvider.execute('valid-freeze-token-hex');

      expect(redisService.set).toHaveBeenCalledWith(
        'lock:change-email-frozen:usr-victim',
        'locked',
        24 * 60 * 60,
      );
      expect(redisService.revokeAllUserSessions).toHaveBeenCalledWith('usr-victim');
      expect(result.success).toBe(true);
    });
  });

  describe('RollbackEmailProvider', () => {
    it('should reject invalid or expired rollback token', async () => {
      mockHistoryRepo.findOne.mockResolvedValue(null);

      await expect(
        rollbackEmailProvider.execute('invalid-rollback-token'),
      ).rejects.toThrow(RpcException);
    });

    it('should revert email, flag mandatory password change, mark token as reverted and terminate sessions', async () => {
      const historyRecord = {
        userId: 'usr-restored',
        previousEmail: 'original@example.com',
        isReverted: false,
      };
      mockHistoryRepo.findOne.mockResolvedValue(historyRecord);

      const user = {
        id: 'usr-restored',
        email: 'compromised@example.com',
        mustChangePassword: false,
      } as Users;

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(user) // user lookup
        .mockResolvedValueOnce(null); // previous email availability check

      const result = await rollbackEmailProvider.execute('valid-rollback-token-hex');

      expect(user.email).toBe('original@example.com');
      expect(user.mustChangePassword).toBe(true);
      expect(historyRecord.isReverted).toBe(true);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(redisService.revokeAllUserSessions).toHaveBeenCalledWith('usr-restored');
      expect(result.success).toBe(true);
    });
  });
});
