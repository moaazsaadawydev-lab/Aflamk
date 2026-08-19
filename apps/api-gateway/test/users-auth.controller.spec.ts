import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from '@booking-ticket-system/Guards';
import { UsersAuthController } from '../src/app/api-gateway-service/Controllers/Users/users-auth.controller';
import { AuthProvider } from '../src/app/api-gateway-service/providers';

describe('UsersAuthController (api-gateway)', () => {
  let controller: UsersAuthController;
  let authProvider: jest.Mocked<AuthProvider>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockAuthProvider = {
      login: jest.fn().mockResolvedValue({ accessToken: 'access-token-123' }),
      googleLogin: jest.fn().mockResolvedValue({ accessToken: 'google-access-token' }),
      logout: jest.fn().mockResolvedValue({ success: true, message: 'Logged out successfully.' }),
      refresh: jest.fn().mockResolvedValue({ accessToken: 'new-access-token' }),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'FRONTEND_REDIRECT_URL') return 'http://localhost:4200';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersAuthController],
      providers: [
        {
          provide: AuthProvider,
          useValue: mockAuthProvider,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AuthGuard('google'))
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersAuthController>(UsersAuthController);
    authProvider = module.get(AuthProvider);
    configService = module.get(ConfigService);
  });

  it('login: should delegate to authProvider.login and return accessToken', async () => {
    const mockReq: any = {
      headers: { 'x-forwarded-for': '203.0.113.195' },
      socket: { remoteAddress: '127.0.0.1' },
    };
    const mockRes: any = { cookie: jest.fn() };

    const result = await controller.login(
      { email: 'user@example.com', password: 'Password@123' },
      'Mozilla/5.0 Chrome',
      mockReq,
      mockRes,
    );

    expect(authProvider.login).toHaveBeenCalledWith(
      { email: 'user@example.com', password: 'Password@123' },
      'Mozilla/5.0 Chrome',
      '203.0.113.195',
      mockRes,
    );
    expect(result).toEqual({ accessToken: 'access-token-123' });
  });

  it('googleAuthCallback: should process google login and redirect to frontend', async () => {
    const mockReq: any = {
      user: { googleId: 'gid-123', email: 'google@example.com' },
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
    };
    const mockRes: any = {
      redirect: jest.fn(),
    };

    await controller.googleAuthCallback(mockReq, mockRes, 'Mozilla');

    expect(authProvider.googleLogin).toHaveBeenCalledWith(
      mockReq.user,
      '127.0.0.1',
      'Mozilla',
      mockRes,
    );
    expect(mockRes.redirect).toHaveBeenCalledWith('http://localhost:4200');
  });

  it('logout: should delegate to authProvider.logout', async () => {
    const mockUser = { id: 'usr-1', sessionId: 'sess-1' };
    const mockRes: any = { clearCookie: jest.fn() };

    const result = await controller.logout(mockUser, mockRes);

    expect(authProvider.logout).toHaveBeenCalledWith(mockUser, mockRes);
    expect(result).toEqual({ success: true, message: 'Logged out successfully.' });
  });

  it('refresh: should extract refreshToken from cookie and delegate to authProvider.refresh', async () => {
    const mockReq: any = {
      cookies: { refreshToken: 'cookie-refresh-token-123' },
    };
    const mockRes: any = { cookie: jest.fn() };

    const result = await controller.refresh(mockReq, mockRes);

    expect(authProvider.refresh).toHaveBeenCalledWith(
      'cookie-refresh-token-123',
      mockRes,
    );
    expect(result).toEqual({ accessToken: 'new-access-token' });
  });

  it('revokeAllSessions: should delegate to authProvider.logout', async () => {
    const mockUser = { id: 'usr-1' };
    const mockRes: any = { clearCookie: jest.fn() };

    const result = await controller.revokeAllSessions(mockUser, mockRes);

    expect(authProvider.logout).toHaveBeenCalledWith(mockUser, mockRes);
    expect(result.success).toBe(true);
  });

  it('getSessions: should return active session details for current user', async () => {
    const mockUser = { id: 'usr-1', sessionId: 'sess-123' };

    const result = await controller.getSessions(mockUser);

    expect(result).toEqual({
      userId: 'usr-1',
      sessionId: 'sess-123',
      active: true,
    });
  });
});
