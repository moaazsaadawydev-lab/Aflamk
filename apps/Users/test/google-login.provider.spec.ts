import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { Users } from '@booking-ticket-system/Entities';
import { AuthProviderType, UserRole, UserStatus } from '@booking-ticket-system/Utils';
import { GoogleLoginProvider } from '../src/app/Users/Providers/auth/google-login.provider';
import { SessionService } from '../src/app/Users/Services/session.service';

describe('GoogleLoginProvider', () => {
  let provider: GoogleLoginProvider;
  let userRepository: jest.Mocked<Repository<Users>>;
  let sessionService: jest.Mocked<SessionService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockUserRepository = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ ...dto })),
      save: jest.fn().mockImplementation((user) => Promise.resolve(user)),
    };

    const mockSessionService = {
      validateAndResolveUserStatus: jest.fn().mockResolvedValue(undefined),
      createSession: jest.fn().mockResolvedValue({
        accessToken: 'mock-google-access-token',
        refreshToken: 'mock-google-refresh-token',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleLoginProvider,
        {
          provide: getRepositoryToken(Users),
          useValue: mockUserRepository,
        },
        {
          provide: SessionService,
          useValue: mockSessionService,
        },
      ],
    }).compile();

    provider = module.get<GoogleLoginProvider>(GoogleLoginProvider);
    userRepository = module.get(getRepositoryToken(Users));
    sessionService = module.get(SessionService);
  });

  it('should throw INVALID_ARGUMENT when email or googleId is missing', async () => {
    await expect(
      provider.execute({
        googleId: '',
        email: 'test@example.com',
      } as any),
    ).rejects.toThrow(RpcException);

    await expect(
      provider.execute({
        googleId: 'gid-123',
        email: '',
      } as any),
    ).rejects.toThrow(RpcException);
  });

  it('Scenario A: First-time sign up - auto-provisions new user and creates session', async () => {
    userRepository.findOne.mockResolvedValue(null);

    const result = await provider.execute({
      googleId: 'gid-12345',
      email: 'newgoogleuser@example.com',
      name: 'Google User',
      avatarUrl: 'https://lh3.googleusercontent.com/avatar.jpg',
      birthDate: '1995-05-15',
      userAgent: 'Mozilla',
      ipAddress: '127.0.0.1',
    });

    expect(userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'newgoogleuser@example.com',
        googleId: 'gid-12345',
        provider: AuthProviderType.GOOGLE,
        status: UserStatus.ACTIVE,
        password: null,
      }),
    );
    expect(userRepository.save).toHaveBeenCalledTimes(1);
    expect(sessionService.createSession).toHaveBeenCalled();
    expect(result).toEqual({
      accessToken: 'mock-google-access-token',
      refreshToken: 'mock-google-refresh-token',
    });
  });

  it('Scenario B: Existing local user auto-linking - links googleId and activates account', async () => {
    const existingLocalUser = {
      id: 'usr-local-1',
      email: 'existing@example.com',
      googleId: null,
      provider: AuthProviderType.LOCAL,
      status: UserStatus.UNVERIFIED,
      avatarUrl: null,
    } as unknown as Users;

    userRepository.findOne.mockResolvedValue(existingLocalUser);

    await provider.execute({
      googleId: 'gid-67890',
      email: 'existing@example.com',
      name: 'Existing User',
      avatarUrl: 'https://lh3.googleusercontent.com/new-avatar.jpg',
    });

    expect(existingLocalUser.googleId).toBe('gid-67890');
    expect(existingLocalUser.provider).toBe(AuthProviderType.GOOGLE);
    expect(existingLocalUser.status).toBe(UserStatus.ACTIVE);
    expect(existingLocalUser.avatarUrl).toBe('https://lh3.googleusercontent.com/new-avatar.jpg');
    expect(userRepository.save).toHaveBeenCalledWith(existingLocalUser);
    expect(sessionService.createSession).toHaveBeenCalledWith(
      existingLocalUser,
      undefined,
      undefined,
    );
  });

  it('Scenario C: Existing Google user login - resolves status and creates session', async () => {
    const existingGoogleUser = {
      id: 'usr-google-1',
      email: 'googleuser@example.com',
      googleId: 'gid-12345',
      provider: AuthProviderType.GOOGLE,
      status: UserStatus.ACTIVE,
      avatarUrl: 'https://lh3.googleusercontent.com/existing.jpg',
    } as Users;

    userRepository.findOne.mockResolvedValue(existingGoogleUser);

    await provider.execute({
      googleId: 'gid-12345',
      email: 'googleuser@example.com',
      name: 'Google User',
    });

    expect(sessionService.validateAndResolveUserStatus).toHaveBeenCalledWith(
      existingGoogleUser,
    );
    expect(sessionService.createSession).toHaveBeenCalledWith(
      existingGoogleUser,
      undefined,
      undefined,
    );
  });
});
