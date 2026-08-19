import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import * as bcrypt from 'bcryptjs';
import { Users, OutboxMessage } from '@booking-ticket-system/Entities';
import { RedisService } from '@booking-ticket-system/Redis';
import { UpdatePasswordsProvider } from '../src/app/Users/Providers/password/UpdatePasswords.provider';
import { ForgotPasswordProvider } from '../src/app/Users/Providers/password/forgot-password.provider';
import { ResetPasswordProvider } from '../src/app/Users/Providers/password/reset-password.provider';
import { OutboxPublisherService } from '../src/app/outbox/outbox-publisher.service';

describe('Password Providers Suite', () => {
  let updatePasswordsProvider: UpdatePasswordsProvider;
  let forgotPasswordProvider: ForgotPasswordProvider;
  let resetPasswordProvider: ResetPasswordProvider;
  let userRepository: jest.Mocked<Repository<Users>>;
  let redisService: jest.Mocked<RedisService>;
  let outboxService: jest.Mocked<OutboxPublisherService>;

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
        UpdatePasswordsProvider,
        ForgotPasswordProvider,
        ResetPasswordProvider,
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

    updatePasswordsProvider = module.get(UpdatePasswordsProvider);
    forgotPasswordProvider = module.get(ForgotPasswordProvider);
    resetPasswordProvider = module.get(ResetPasswordProvider);
    userRepository = module.get(getRepositoryToken(Users));
    redisService = module.get(RedisService);
    outboxService = module.get(OutboxPublisherService);
  });

  describe('UpdatePasswordsProvider', () => {
    it('should reject local user password change if current password is wrong', async () => {
      const currentHashed = await bcrypt.hash('OldPassword@123', 10);
      mockQueryRunner.manager.findOne.mockResolvedValue({
        id: 'usr-1',
        password: currentHashed,
      } as Users);

      await expect(
        updatePasswordsProvider.execute({
          userId: 'usr-1',
          oldPassword: 'WrongOldPassword',
          newPassword: 'NewPassword@123',
        }),
      ).rejects.toThrow(RpcException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should reject local user password change if new password is same as current password', async () => {
      const currentHashed = await bcrypt.hash('SamePassword@123', 10);
      mockQueryRunner.manager.findOne.mockResolvedValue({
        id: 'usr-1',
        password: currentHashed,
      } as Users);

      await expect(
        updatePasswordsProvider.execute({
          userId: 'usr-1',
          oldPassword: 'SamePassword@123',
          newPassword: 'SamePassword@123',
        }),
      ).rejects.toThrow(RpcException);
    });

    it('should allow Google user without existing password to set new password without oldPassword', async () => {
      const googleUser = {
        id: 'usr-google',
        email: 'google@example.com',
        password: null,
      } as unknown as Users;

      mockQueryRunner.manager.findOne.mockResolvedValue(googleUser);

      const result = await updatePasswordsProvider.execute({
        userId: 'usr-google',
        newPassword: 'NewSetPassword@123',
      });

      expect(googleUser.password).not.toBeNull();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(redisService.revokeAllUserSessions).toHaveBeenCalledWith('usr-google');
      expect(result.success).toBe(true);
    });
  });

  describe('ForgotPasswordProvider', () => {
    it('should reject request when account recovery is temporarily locked out', async () => {
      redisService.exists.mockResolvedValue(true);

      await expect(
        forgotPasswordProvider.execute('locked@example.com'),
      ).rejects.toThrow(RpcException);
    });

    it('should return success without leaking existence for non-existent user', async () => {
      redisService.exists.mockResolvedValue(false);
      userRepository.findOne.mockResolvedValue(null);

      const result = await forgotPasswordProvider.execute('nobody@example.com');
      expect(result.success).toBe(true);
      expect(result.message).toMatch(/if the email exists/i);
    });

    it('should generate OTP and save outbox event for existing user', async () => {
      redisService.exists.mockResolvedValue(false);
      userRepository.findOne.mockResolvedValue({
        id: 'usr-forgot',
        email: 'existing@example.com',
      } as Users);

      const result = await forgotPasswordProvider.execute('existing@example.com');

      expect(redisService.set).toHaveBeenCalledWith(
        'otp:reset-password:existing@example.com',
        expect.any(String),
        expect.any(Number),
      );
      expect(result.success).toBe(true);
    });
  });

  describe('ResetPasswordProvider', () => {
    it('should reject when newPassword and confirmPassword do not match', async () => {
      await expect(
        resetPasswordProvider.execute({
          email: 'test@example.com',
          otp: '123456',
          newPassword: 'Password1',
          confirmPassword: 'Password2',
        }),
      ).rejects.toThrow(RpcException);
    });

    it('should lock out user for 15 minutes when brute-force attempts exceed MAX_OTP_ATTEMPTS (5)', async () => {
      redisService.exists.mockResolvedValue(false);
      redisService.incrementCounter.mockResolvedValue(6);

      await expect(
        resetPasswordProvider.execute({
          email: 'brute@example.com',
          otp: '999999',
          newPassword: 'Password@123',
        }),
      ).rejects.toThrow(RpcException);

      expect(redisService.set).toHaveBeenCalledWith(
        'lock:reset-password:brute@example.com',
        'locked',
        expect.any(Number),
      );
    });

    it('should reset password, revoke all user sessions, and auto-unlock security freeze on success', async () => {
      const user = {
        id: 'usr-reset-1',
        email: 'reset-success@example.com',
        mustChangePassword: true,
      } as Users;

      redisService.exists.mockResolvedValue(false);
      redisService.incrementCounter.mockResolvedValue(1);
      redisService.get.mockResolvedValue('123456');
      mockQueryRunner.manager.findOne.mockResolvedValue(user);

      const result = await resetPasswordProvider.execute({
        email: 'reset-success@example.com',
        otp: '123456',
        newPassword: 'NewSecurePassword@123',
      });

      expect(user.mustChangePassword).toBe(false);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(redisService.del).toHaveBeenCalledWith('lock:change-email-frozen:usr-reset-1');
      expect(redisService.revokeAllUserSessions).toHaveBeenCalledWith('usr-reset-1');
      expect(result.success).toBe(true);
    });
  });
});
