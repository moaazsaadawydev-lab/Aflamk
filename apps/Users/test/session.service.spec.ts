import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { Repository } from 'typeorm';
import { Users } from '@booking-ticket-system/Entities';
import { RedisService } from '@booking-ticket-system/Redis';
import { UserRole, UserStatus } from '@booking-ticket-system/Utils';
import { SessionService } from '../src/app/Users/Services/session.service';

describe('SessionService', () => {
  let service: SessionService;
  let userRepository: jest.Mocked<Repository<Users>>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let redisService: jest.Mocked<RedisService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockUserRepository = {
      save: jest.fn().mockImplementation((user) => Promise.resolve(user)),
      findOne: jest.fn(),
    };

    const mockJwtService = {
      signAsync: jest.fn().mockImplementation((payload) => Promise.resolve(`signed-jwt-${JSON.stringify(payload.id || payload.role)}`)),
      verifyAsync: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          JWT_ACCESS_SECRET: 'access-secret-12345',
          JWT_ACCESS_EXPIRE_IN: '15m',
          JWT_REFRESH_SECRET: 'refresh-secret-12345',
          JWT_REFRESH_EXPIRE_IN: '7d',
        };
        return config[key];
      }),
    };

    const mockRedisService = {
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      sadd: jest.fn().mockResolvedValue(1),
      del: jest.fn().mockResolvedValue(1),
      srem: jest.fn().mockResolvedValue(1),
      exists: jest.fn().mockResolvedValue(false),
      revokeAllUserSessions: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
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
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
    userRepository = module.get(getRepositoryToken(Users));
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    redisService = module.get(RedisService);
  });

  describe('parseDurationToMs', () => {
    it('should parse seconds, minutes, hours, and days properly', () => {
      expect(service.parseDurationToMs('30s')).toBe(30 * 1000);
      expect(service.parseDurationToMs('15m')).toBe(15 * 60 * 1000);
      expect(service.parseDurationToMs('2h')).toBe(2 * 60 * 60 * 1000);
      expect(service.parseDurationToMs('7d')).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it('should handle numeric inputs and defaults', () => {
      expect(service.parseDurationToMs(120)).toBe(120 * 1000);
      expect(service.parseDurationToMs(undefined)).toBe(7 * 24 * 60 * 60 * 1000);
      expect(service.parseDurationToMs('invalid')).toBe(7 * 24 * 60 * 60 * 1000);
    });
  });

  describe('validateAndResolveUserStatus', () => {
    it('should throw PERMISSION_DENIED when user is UNVERIFIED', async () => {
      const user = { id: 'u1', status: UserStatus.UNVERIFIED } as Users;

      await expect(service.validateAndResolveUserStatus(user)).rejects.toThrow(
        RpcException,
      );

      try {
        await service.validateAndResolveUserStatus(user);
      } catch (err: any) {
        expect(err.error.code).toBe(status.PERMISSION_DENIED);
        expect(err.error.message).toMatch(/verify your email/i);
      }
    });

    it('should throw PERMISSION_DENIED when user is SUSPENDED with active suspension', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const user = {
        id: 'u2',
        status: UserStatus.SUSPENDED,
        suspendedUntil: futureDate,
        statusReason: 'Security audit hold',
      } as Users;

      await expect(service.validateAndResolveUserStatus(user)).rejects.toThrow(
        RpcException,
      );

      try {
        await service.validateAndResolveUserStatus(user);
      } catch (err: any) {
        expect(err.error.code).toBe(status.PERMISSION_DENIED);
        expect(err.error.message).toMatch(/Security audit hold/);
      }
    });

    it('should auto-unlock SUSPENDED account when suspension date has expired', async () => {
      const pastDate = new Date(Date.now() - 10000);
      const user = {
        id: 'u3',
        status: UserStatus.SUSPENDED,
        suspendedUntil: pastDate,
        statusReason: 'Temporary cooldown',
      } as Users;

      await service.validateAndResolveUserStatus(user);

      expect(user.status).toBe(UserStatus.ACTIVE);
      expect(user.statusReason).toBeNull();
      expect(user.suspendedUntil).toBeNull();
      expect(userRepository.save).toHaveBeenCalledWith(user);
    });

    it('should throw PERMISSION_DENIED when user is BLOCKED', async () => {
      const user = { id: 'u4', status: UserStatus.BLOCKED } as Users;

      await expect(service.validateAndResolveUserStatus(user)).rejects.toThrow(
        RpcException,
      );

      try {
        await service.validateAndResolveUserStatus(user);
      } catch (err: any) {
        expect(err.error.code).toBe(status.PERMISSION_DENIED);
        expect(err.error.message).toMatch(/permanently blocked/i);
      }
    });

    it('should throw NOT_FOUND when user is DELETED', async () => {
      const user = { id: 'u5', status: UserStatus.DELETED } as Users;

      await expect(service.validateAndResolveUserStatus(user)).rejects.toThrow(
        RpcException,
      );

      try {
        await service.validateAndResolveUserStatus(user);
      } catch (err: any) {
        expect(err.error.code).toBe(status.NOT_FOUND);
      }
    });

    it('should allow ACTIVE user without error', async () => {
      const user = { id: 'u6', status: UserStatus.ACTIVE } as Users;
      await expect(service.validateAndResolveUserStatus(user)).resolves.not.toThrow();
    });
  });

  describe('createSession', () => {
    it('should create JWT tokens and persist bcrypt-hashed session in Redis', async () => {
      const user = {
        id: 'usr-123',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      } as Users;

      const result = await service.createSession(
        user,
        'Mozilla/5.0 Chrome',
        '127.0.0.1',
      );

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);

      expect(redisService.set).toHaveBeenCalledTimes(1);
      expect(redisService.sadd).toHaveBeenCalledTimes(1);

      const [sessionKey, sessionData, ttl] = (redisService.set as jest.Mock).mock.calls[0];
      expect(sessionKey).toMatch(/^session:usr-123:/);
      expect(sessionData).toHaveProperty('refreshTokenHash');
      expect(sessionData.userAgent).toBe('Mozilla/5.0 Chrome');
      expect(sessionData.ipAddress).toBe('127.0.0.1');
      expect(ttl).toBe(7 * 24 * 60 * 60);
    });
  });
});
