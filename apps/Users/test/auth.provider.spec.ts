import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Users } from '@booking-ticket-system/Entities';
import { RedisService } from '@booking-ticket-system/Redis';
import { UserRole, UserStatus } from '@booking-ticket-system/Utils';
import { AuthProvider } from '../src/app/Users/Providers/auth.provider';
import { SessionService } from '../src/app/Users/Services/session.service';

describe('AuthProvider (Users Microservice)', () => {
  let provider: AuthProvider;
  let userRepository: jest.Mocked<Repository<Users>>;
  let jwtService: jest.Mocked<JwtService>;
  let redisService: jest.Mocked<RedisService>;
  let sessionService: jest.Mocked<SessionService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockUserRepository = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((u) => Promise.resolve(u)),
    };

    const mockJwtService = {
      signAsync: jest.fn().mockImplementation((payload) => Promise.resolve(`jwt-token-${payload.sessionId || payload.id}`)),
      verifyAsync: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          JWT_ACCESS_SECRET: 'access-secret-test',
          JWT_ACCESS_EXPIRE_IN: '15m',
          JWT_REFRESH_SECRET: 'refresh-secret-test',
          JWT_REFRESH_EXPIRE_IN: '7d',
        };
        return config[key];
      }),
    };

    const mockRedisService = {
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn(),
      del: jest.fn().mockResolvedValue(1),
      srem: jest.fn().mockResolvedValue(1),
      revokeAllUserSessions: jest.fn().mockResolvedValue(undefined),
    };

    const mockSessionService = {
      validateAndResolveUserStatus: jest.fn().mockResolvedValue(undefined),
      createSession: jest.fn().mockResolvedValue({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      }),
      parseDurationToMs: jest.fn().mockReturnValue(7 * 24 * 60 * 60 * 1000),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthProvider,
        {
          provide: getRepositoryToken(Users),
          useValue: mockUserRepository,
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
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: SessionService,
          useValue: mockSessionService,
        },
      ],
    }).compile();

    provider = module.get<AuthProvider>(AuthProvider);
    userRepository = module.get(getRepositoryToken(Users));
    jwtService = module.get(JwtService);
    redisService = module.get(RedisService);
    sessionService = module.get(SessionService);
  });

  describe('login', () => {
    it('should authenticate user with valid credentials and return tokens', async () => {
      const plainPassword = 'ValidPassword@123';
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      const mockUser = {
        id: 'usr-1',
        email: 'user@example.com',
        password: hashedPassword,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      } as Users;

      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await provider.login({
        email: '  USER@EXAMPLE.COM ',
        password: plainPassword,
        userAgent: 'test-agent',
        ipAddress: '127.0.0.1',
      });

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
      });
      expect(sessionService.validateAndResolveUserStatus).toHaveBeenCalledWith(mockUser);
      expect(sessionService.createSession).toHaveBeenCalledWith(
        mockUser,
        'test-agent',
        '127.0.0.1',
      );
      expect(result).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      });
    });

    it('should throw UNAUTHENTICATED when user does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        provider.login({
          email: 'nonexistent@example.com',
          password: 'AnyPassword@123',
        }),
      ).rejects.toThrow(RpcException);

      try {
        await provider.login({
          email: 'nonexistent@example.com',
          password: 'AnyPassword@123',
        });
      } catch (err: any) {
        expect(err.error.code).toBe(status.UNAUTHENTICATED);
        expect(err.error.message).toMatch(/invalid email or password/i);
      }
    });

    it('should throw UNAUTHENTICATED when user has no password set (OAuth-only account)', async () => {
      const mockOAuthUser = {
        id: 'usr-oauth',
        email: 'oauth@example.com',
        password: null,
        status: UserStatus.ACTIVE,
      } as unknown as Users;

      userRepository.findOne.mockResolvedValue(mockOAuthUser);

      await expect(
        provider.login({
          email: 'oauth@example.com',
          password: 'AnyPassword@123',
        }),
      ).rejects.toThrow(RpcException);
    });

    it('should throw UNAUTHENTICATED when password does not match', async () => {
      const hashedPassword = await bcrypt.hash('CorrectPassword@123', 10);
      const mockUser = {
        id: 'usr-1',
        email: 'user@example.com',
        password: hashedPassword,
      } as Users;

      userRepository.findOne.mockResolvedValue(mockUser);

      await expect(
        provider.login({
          email: 'user@example.com',
          password: 'WrongPassword@123',
        }),
      ).rejects.toThrow(RpcException);
    });
  });

  describe('refresh', () => {
    it('should rotate refresh token and return new token pair for valid session', async () => {
      const rawRefreshToken = 'valid-refresh-token-string';
      const hashedRefreshToken = await bcrypt.hash(rawRefreshToken, 10);

      jwtService.verifyAsync.mockResolvedValue({
        id: 'usr-1',
        sessionId: 'sess-abc',
      });

      redisService.get.mockResolvedValue({
        refreshTokenHash: hashedRefreshToken,
        userAgent: 'test-agent',
        ipAddress: '127.0.0.1',
        createdAt: new Date().toISOString(),
      });

      userRepository.findOne.mockResolvedValue({
        id: 'usr-1',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      } as Users);

      const result = await provider.refresh(rawRefreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.message).toBe('Success');
      expect(redisService.set).toHaveBeenCalledTimes(1);
    });

    it('should throw UNAUTHENTICATED when JWT verification fails', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await expect(provider.refresh('expired-token')).rejects.toThrow(
        RpcException,
      );

      try {
        await provider.refresh('expired-token');
      } catch (err: any) {
        expect(err.error.code).toBe(status.UNAUTHENTICATED);
        expect(err.error.message).toMatch(/invalid or expired refresh token/i);
      }
    });

    it('should throw UNAUTHENTICATED when session is not in Redis', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        id: 'usr-1',
        sessionId: 'sess-revoked',
      });

      redisService.get.mockResolvedValue(null);

      await expect(provider.refresh('token-for-revoked-session')).rejects.toThrow(
        RpcException,
      );
    });

    it('should detect token replay attack (hash mismatch), purge Redis session and reject', async () => {
      const rawRefreshToken = 'old-compromised-token';
      const storedHash = await bcrypt.hash('different-current-token', 10);

      jwtService.verifyAsync.mockResolvedValue({
        id: 'usr-1',
        sessionId: 'sess-replay',
      });

      redisService.get.mockResolvedValue({
        refreshTokenHash: storedHash,
        userAgent: 'test-agent',
        ipAddress: '127.0.0.1',
      });

      await expect(provider.refresh(rawRefreshToken)).rejects.toThrow(
        RpcException,
      );

      expect(redisService.del).toHaveBeenCalledWith('session:usr-1:sess-replay');
      expect(redisService.srem).toHaveBeenCalledWith('user:sessions:usr-1', 'sess-replay');
    });

    it('should throw PERMISSION_DENIED if user account is not active on refresh', async () => {
      const rawRefreshToken = 'valid-token';
      const hashedRefreshToken = await bcrypt.hash(rawRefreshToken, 10);

      jwtService.verifyAsync.mockResolvedValue({
        id: 'usr-1',
        sessionId: 'sess-inactive',
      });

      redisService.get.mockResolvedValue({
        refreshTokenHash: hashedRefreshToken,
      });

      userRepository.findOne.mockResolvedValue({
        id: 'usr-1',
        status: UserStatus.BLOCKED,
      } as Users);

      await expect(provider.refresh(rawRefreshToken)).rejects.toThrow(
        RpcException,
      );

      try {
        await provider.refresh(rawRefreshToken);
      } catch (err: any) {
        expect(err.error.code).toBe(status.PERMISSION_DENIED);
      }
    });
  });
});
