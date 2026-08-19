import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AuthProvider, RegistrationProvider, UserProfileProvider } from '../src/app/api-gateway-service/providers';
import { MinioService } from '@booking-ticket-system/Storage';
import { Users } from '@booking-ticket-system/Entities';
import { GoogleStrategy } from '../src/app/api-gateway-service/providers/google.strategy';
import { ConfigService } from '@nestjs/config';

describe('API Gateway Providers Suite', () => {
  let authProvider: AuthProvider;
  let registrationProvider: RegistrationProvider;
  let userProfileProvider: UserProfileProvider;
  let minioService: jest.Mocked<MinioService>;

  let mockGrpcService: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockGrpcService = {
      Login: jest.fn().mockReturnValue(of({ accessToken: 'acc-1', refreshToken: 'ref-1' })),
      RefreshToken: jest.fn().mockReturnValue(of({ accessToken: 'new-acc-1', refreshToken: 'new-ref-1' })),
      GoogleLogin: jest.fn().mockReturnValue(of({ accessToken: 'g-acc', refreshToken: 'g-ref' })),
      Logout: jest.fn().mockReturnValue(of({ success: true, message: 'Logged out' })),
      VerifyEmail: jest.fn().mockReturnValue(of({ message: 'Verified' })),
      ChangePassword: jest.fn().mockReturnValue(of({ message: 'Password updated' })),
      ForgotPassword: jest.fn().mockReturnValue(of({ success: true, message: 'Reset sent' })),
      ResetPassword: jest.fn().mockReturnValue(of({ success: true, message: 'Reset done' })),
      RequestChangeEmail: jest.fn().mockReturnValue(of({ success: true, message: 'OTP sent' })),
      ConfirmChangeEmail: jest.fn().mockReturnValue(of({ success: true, message: 'Email changed' })),
      FreezeAccount: jest.fn().mockReturnValue(of({ success: true, message: 'Account frozen' })),
      RollbackEmail: jest.fn().mockReturnValue(of({ success: true, message: 'Email rolled back' })),
      ResendVerificationCode: jest.fn().mockReturnValue(of({ success: true, message: 'Resent' })),
      UpdateUserStatus: jest.fn().mockReturnValue(of({ success: true, status: 'ACTIVE' })),
      Register: jest.fn().mockReturnValue(of({ message: 'Created', user: { id: 'usr-new' } })),
      CurrentUser: jest.fn().mockReturnValue(of({ id: 'usr-1', email: 'me@example.com' })),
      UpdateProfile: jest.fn().mockReturnValue(of({ id: 'usr-1', name: 'Updated' })),
    };

    const mockClientGrpc = {
      getService: jest.fn().mockReturnValue(mockGrpcService),
    };

    const mockMinioService = {
      uploadBuffer: jest.fn().mockResolvedValue('temp/file-uuid.raw'),
      deleteObject: jest.fn().mockResolvedValue(undefined),
    };

    const mockConfigService = {
      get: jest.fn((k: string) => {
        const conf: Record<string, string> = {
          GOOGLE_CLIENT_ID: 'test-google-id',
          GOOGLE_CLIENT_SECRET: 'test-google-secret',
          GOOGLE_CALLBACK_URL: 'http://localhost:3000/api/v1/users/auth/google/callback',
        };
        return conf[k];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthProvider,
        RegistrationProvider,
        UserProfileProvider,
        GoogleStrategy,
        {
          provide: 'USER_SERVICE',
          useValue: mockClientGrpc,
        },
        {
          provide: MinioService,
          useValue: mockMinioService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    authProvider = module.get(AuthProvider);
    registrationProvider = module.get(RegistrationProvider);
    userProfileProvider = module.get(UserProfileProvider);
    minioService = module.get(MinioService);

    authProvider.onModuleInit();
    registrationProvider.onModuleInit();
    userProfileProvider.onModuleInit();
  });

  describe('AuthProvider', () => {
    it('login: should call gRPC Login and set refreshToken cookie', async () => {
      const mockRes: any = { cookie: jest.fn() };

      const result = await authProvider.login(
        { email: 'test@example.com', password: 'Password@123' },
        'Mozilla',
        '127.0.0.1',
        mockRes,
      );

      expect(mockGrpcService.Login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password@123',
        user_agent: 'Mozilla',
        ip_address: '127.0.0.1',
      });
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'ref-1',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
        }),
      );
      expect(result).toEqual({ accessToken: 'acc-1' });
    });

    it('refresh: should throw UnauthorizedException when refreshToken is missing', async () => {
      const mockRes: any = { cookie: jest.fn() };
      await expect(authProvider.refresh('', mockRes)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('refresh: should rotate refreshToken cookie when valid token is provided', async () => {
      const mockRes: any = { cookie: jest.fn() };

      const result = await authProvider.refresh('old-ref-1', mockRes);

      expect(mockGrpcService.RefreshToken).toHaveBeenCalledWith({
        refresh_token: 'old-ref-1',
      });
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'new-ref-1',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(result).toEqual({ accessToken: 'new-acc-1' });
    });

    it('logout: should call gRPC Logout and clear accessToken and refreshToken cookies', async () => {
      const mockRes: any = { clearCookie: jest.fn() };

      const result = await authProvider.logout(
        { id: 'usr-1', sessionId: 'sess-1' },
        mockRes,
      );

      expect(mockGrpcService.Logout).toHaveBeenCalledWith({
        user_id: 'usr-1',
        session_id: 'sess-1',
      });
      expect(mockRes.clearCookie).toHaveBeenCalledWith('accessToken', expect.any(Object));
      expect(mockRes.clearCookie).toHaveBeenCalledWith('refreshToken', expect.any(Object));
      expect(result.success).toBe(true);
    });
  });

  describe('RegistrationProvider', () => {
    it('register: should throw BadRequestException if file is provided without crop coordinates', async () => {
      const mockFile: any = { buffer: Buffer.from('img'), mimetype: 'image/jpeg' };

      await expect(
        registrationProvider.register(
          { email: 'crop@example.com', password: 'Password@123' } as any,
          mockFile,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('register: should upload to MinIO and forward temp_object_key when avatar file is valid with crop data', async () => {
      const mockFile: any = { buffer: Buffer.from('img'), mimetype: 'image/jpeg' };

      const result = await registrationProvider.register(
        {
          email: 'validcrop@example.com',
          password: 'Password@123',
          cropX: 0,
          cropY: 0,
          cropWidth: 100,
          cropHeight: 100,
          cropZoom: 1,
        } as any,
        mockFile,
      );

      expect(minioService.uploadBuffer).toHaveBeenCalled();
      expect(mockGrpcService.Register).toHaveBeenCalledWith(
        expect.objectContaining({
          temp_object_key: expect.stringMatching(/^temp\//),
        }),
      );
      expect(result).toHaveProperty('message', 'Created');
    });

    it('register: should clean up uploaded MinIO temp file when gRPC call fails', async () => {
      const mockFile: any = { buffer: Buffer.from('img'), mimetype: 'image/jpeg' };
      mockGrpcService.Register.mockReturnValue(throwError(() => new Error('gRPC connection error')));

      await expect(
        registrationProvider.register(
          {
            email: 'fail@example.com',
            password: 'Password@123',
            cropX: 0,
            cropY: 0,
            cropWidth: 100,
            cropHeight: 100,
            cropZoom: 1,
          } as any,
          mockFile,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(minioService.deleteObject).toHaveBeenCalled();
    });
  });

  describe('UserProfileProvider', () => {
    it('getProfile: should retrieve profile by user ID', async () => {
      const result = await userProfileProvider.getProfile({ id: 'usr-1' } as Users);
      expect(mockGrpcService.CurrentUser).toHaveBeenCalledWith({ id: 'usr-1' });
      expect(result).toEqual({ id: 'usr-1', email: 'me@example.com' });
    });

    it('updateProfile: should upload image if present and call UpdateProfile', async () => {
      const mockFile: any = { buffer: Buffer.from('pic'), mimetype: 'image/webp' };

      const result = await userProfileProvider.updateProfile(
        { id: 'usr-1' } as Users,
        { name: 'Updated Name' },
        mockFile,
      );

      expect(minioService.uploadBuffer).toHaveBeenCalled();
      expect(mockGrpcService.UpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Name',
          userId: 'usr-1',
        }),
      );
      expect(result).toEqual({ id: 'usr-1', name: 'Updated' });
    });
  });

  describe('GoogleStrategy', () => {
    let googleStrategy: GoogleStrategy;

    beforeEach(() => {
      googleStrategy = new GoogleStrategy(
        {
          get: (key: string) => {
            const conf: Record<string, string> = {
              GOOGLE_CLIENT_ID: 'test-id',
              GOOGLE_CLIENT_SECRET: 'test-secret',
              GOOGLE_CALLBACK_URL: 'http://localhost:3000/api/v1/users/auth/google/callback',
            };
            return conf[key];
          },
        } as any,
      );
    });

    it('validate: should extract normalized Google profile data', async () => {
      const mockProfile = {
        id: 'google-id-12345',
        displayName: 'Google Test User',
        emails: [{ value: 'Google.User@Gmail.COM' }],
        photos: [{ value: 'https://lh3.googleusercontent.com/photo.jpg' }],
      };

      const doneCallback = jest.fn();

      await googleStrategy.validate(
        'access-token-string',
        'refresh-token-string',
        mockProfile as any,
        doneCallback,
      );

      expect(doneCallback).toHaveBeenCalledWith(null, {
        googleId: 'google-id-12345',
        email: 'Google.User@Gmail.COM',
        name: 'Google Test User',
        avatarUrl: 'https://lh3.googleusercontent.com/photo.jpg',
      });
    });
  });
});
