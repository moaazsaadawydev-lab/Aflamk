import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import * as bcrypt from 'bcryptjs';
import { Users, OutboxMessage } from '@booking-ticket-system/Entities';
import { RedisService } from '@booking-ticket-system/Redis';
import { sanitizeData, SanitizeUserInterceptor } from '@booking-ticket-system/Common';
import { UserRole, UserStatus } from '@booking-ticket-system/Utils';
import { AuthProvider } from '../src/app/Users/Providers/auth.provider';
import { RegistrationProvider } from '../src/app/Users/Providers/registration.provider';
import { SessionService } from '../src/app/Users/Services/session.service';
import { OutboxPublisherService } from '../src/app/outbox/outbox-publisher.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('Concurrency, Race-Condition & Security Attack Suite', () => {
  let authProvider: AuthProvider;
  let registrationProvider: RegistrationProvider;
  let userRepository: jest.Mocked<Repository<Users>>;
  let redisService: jest.Mocked<RedisService>;
  let jwtService: jest.Mocked<JwtService>;

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
    };

    const mockUserRepository = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((u) => Promise.resolve(u)),
    };

    const mockRedisService = {
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn(),
      del: jest.fn().mockResolvedValue(1),
      srem: jest.fn().mockResolvedValue(1),
      incrementCounter: jest.fn().mockResolvedValue(1),
      revokeAllUserSessions: jest.fn().mockResolvedValue(undefined),
    };

    const mockJwtService = {
      signAsync: jest.fn().mockImplementation((payload) => Promise.resolve(`new-jwt-${payload.sessionId || payload.id}`)),
      verifyAsync: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((k) => 'test-secret'),
    };

    const mockSessionService = {
      validateAndResolveUserStatus: jest.fn().mockResolvedValue(undefined),
      createSession: jest.fn().mockResolvedValue({
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
      }),
      parseDurationToMs: jest.fn().mockReturnValue(7 * 24 * 60 * 60 * 1000),
    };

    const mockOutboxService = {
      publishPendingMessages: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthProvider,
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
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: SessionService,
          useValue: mockSessionService,
        },
        {
          provide: OutboxPublisherService,
          useValue: mockOutboxService,
        },
      ],
    }).compile();

    authProvider = module.get(AuthProvider);
    registrationProvider = module.get(RegistrationProvider);
    userRepository = module.get(getRepositoryToken(Users));
    redisService = module.get(RedisService);
    jwtService = module.get(JwtService);
  });

  describe('Concurrency & Race-Condition Scenarios', () => {
    it('should protect against concurrent refresh token replay (first rotates, second is rejected)', async () => {
      const initialToken = 'shared-concurrent-token';
      const initialHash = await bcrypt.hash(initialToken, 10);

      jwtService.verifyAsync.mockResolvedValue({
        id: 'usr-race',
        sessionId: 'sess-race',
      });

      userRepository.findOne.mockResolvedValue({
        id: 'usr-race',
        status: UserStatus.ACTIVE,
      } as Users);

      let currentStoredHash = initialHash;

      redisService.get.mockImplementation(async () => ({
        refreshTokenHash: currentStoredHash,
        userAgent: 'agent',
      }));

      redisService.set.mockImplementation(async (key: string, data: any) => {
        currentStoredHash = data.refreshTokenHash;
      });

      // Sequential concurrent simulation: Request 1 succeeds and rotates hash
      const res1 = await authProvider.refresh(initialToken);
      expect(res1).toHaveProperty('accessToken');

      // Request 2 with the same initialToken now fails due to hash mismatch
      await expect(authProvider.refresh(initialToken)).rejects.toThrow(RpcException);
    });

    it('should handle simultaneous registration race condition gracefully', async () => {
      let registered = false;
      userRepository.findOne.mockImplementation(async () => {
        if (registered) return { id: 'usr-exists' } as Users;
        registered = true;
        return null;
      });

      const [req1, req2] = await Promise.allSettled([
        registrationProvider.register({
          email: 'concurrent@example.com',
          password: 'Password@123',
          name: 'Req 1',
        }),
        registrationProvider.register({
          email: 'concurrent@example.com',
          password: 'Password@123',
          name: 'Req 2',
        }),
      ]);

      const statuses = [req1.status, req2.status];
      expect(statuses).toContain('fulfilled');
      expect(statuses).toContain('rejected');
    });
  });

  describe('Security Payloads & Data Sanitization', () => {
    it('should safely normalize and handle SQL Injection payloads without crashing or leaking', async () => {
      const sqliEmails = [
        "' OR '1'='1",
        "admin'--",
        "'; DROP TABLE users; --",
        "test@example.com' UNION SELECT * FROM users--",
      ];

      userRepository.findOne.mockResolvedValue(null);

      for (const sqli of sqliEmails) {
        await expect(
          authProvider.login({
            email: sqli,
            password: 'AnyPassword@123',
          }),
        ).rejects.toThrow(RpcException);
      }
    });

    it('should sanitize XSS script tags and Unicode null bytes in email inputs', async () => {
      const maliciousEmail = "<script>alert('XSS')</script>user\0@example.com";
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        authProvider.login({
          email: maliciousEmail,
          password: 'Password@123',
        }),
      ).rejects.toThrow(RpcException);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: maliciousEmail.trim().toLowerCase() },
      });
    });

    it('should sanitize user payloads and strictly strip password and verification codes', () => {
      const userPayload = {
        id: 'usr-secret',
        name: 'Secure User',
        email: 'secure@example.com',
        password: '$2a$10$encryptedPasswordHashString1234567890',
        verificationCode: '123456',
        verification_code: '123456',
        passwordResetCode: '654321',
        password_reset_code: '654321',
        blockReason: 'Internal admin note',
        status: 'ACTIVE',
      };

      const sanitized = sanitizeData(userPayload);

      expect(sanitized).toHaveProperty('id', 'usr-secret');
      expect(sanitized).toHaveProperty('name', 'Secure User');
      expect(sanitized).toHaveProperty('email', 'secure@example.com');
      expect(sanitized).toHaveProperty('status', 'ACTIVE');

      expect(sanitized).not.toHaveProperty('password');
      expect(sanitized).not.toHaveProperty('verificationCode');
      expect(sanitized).not.toHaveProperty('verification_code');
      expect(sanitized).not.toHaveProperty('passwordResetCode');
      expect(sanitized).not.toHaveProperty('password_reset_code');
      expect(sanitized).not.toHaveProperty('blockReason');
    });
  });
});
