import { Test, TestingModule } from '@nestjs/testing';
import {
  ChangeEmailRateLimitGuard,
  ChangePasswordRateLimitGuard,
  ForgotPasswordRateLimitGuard,
  JwtAuthGuard,
} from '@booking-ticket-system/Guards';
import { UsersAccountController } from '../src/app/api-gateway-service/Controllers/Users/users-account.controller';
import { AuthProvider } from '../src/app/api-gateway-service/providers';
import { Users } from '@booking-ticket-system/Entities';

describe('UsersAccountController (api-gateway)', () => {
  let controller: UsersAccountController;
  let authProvider: jest.Mocked<AuthProvider>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockAuthProvider = {
      changePassword: jest.fn().mockResolvedValue({ success: true, message: 'Password updated' }),
      requestChangeEmail: jest.fn().mockResolvedValue({ success: true, message: 'OTP sent' }),
      confirmChangeEmail: jest.fn().mockResolvedValue({ success: true, message: 'Email changed' }),
      forgotPassword: jest.fn().mockResolvedValue({ success: true, message: 'Reset code sent' }),
      resetPassword: jest.fn().mockResolvedValue({ success: true, message: 'Password reset' }),
      freezeAccount: jest.fn().mockResolvedValue({ success: true, message: 'Account frozen' }),
      rollbackEmail: jest.fn().mockResolvedValue({ success: true, message: 'Email rolled back' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersAccountController],
      providers: [
        {
          provide: AuthProvider,
          useValue: mockAuthProvider,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ChangePasswordRateLimitGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ChangeEmailRateLimitGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ForgotPasswordRateLimitGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersAccountController>(UsersAccountController);
    authProvider = module.get(AuthProvider);
  });

  it('changePassword: should delegate to authProvider.changePassword', async () => {
    const mockUser = { id: 'usr-1' } as Users;
    const mockReq: any = {
      headers: { 'x-forwarded-for': '192.168.1.1' },
      socket: { remoteAddress: '127.0.0.1' },
    };

    const result = await controller.changePassword(
      mockUser,
      { oldPassword: 'Old@123', newPassword: 'New@123', confirmPassword: 'New@123' },
      'Mozilla',
      mockReq,
    );

    expect(authProvider.changePassword).toHaveBeenCalledWith(
      mockUser,
      { oldPassword: 'Old@123', newPassword: 'New@123', confirmPassword: 'New@123' },
      'Mozilla',
      '192.168.1.1',
    );
    expect(result.success).toBe(true);
  });

  it('requestChangeEmail: should delegate to authProvider.requestChangeEmail', async () => {
    const mockUser = { id: 'usr-1' } as Users;

    const result = await controller.requestChangeEmail(mockUser, {
      newEmail: 'newemail@example.com',
      currentPassword: 'Password@123',
    });

    expect(authProvider.requestChangeEmail).toHaveBeenCalledWith(mockUser, {
      newEmail: 'newemail@example.com',
      currentPassword: 'Password@123',
    });
    expect(result.success).toBe(true);
  });

  it('confirmChangeEmail: should delegate to authProvider.confirmChangeEmail', async () => {
    const mockUser = { id: 'usr-1' } as Users;
    const mockRes: any = { clearCookie: jest.fn() };

    const result = await controller.confirmChangeEmail(
      mockUser,
      { code: '123456' },
      mockRes,
    );

    expect(authProvider.confirmChangeEmail).toHaveBeenCalledWith(
      mockUser,
      { code: '123456' },
      mockRes,
    );
    expect(result.success).toBe(true);
  });

  it('forgotPassword: should delegate to authProvider.forgotPassword', async () => {
    const result = await controller.forgotPassword({ email: 'test@example.com' });
    expect(authProvider.forgotPassword).toHaveBeenCalledWith({ email: 'test@example.com' });
    expect(result.success).toBe(true);
  });

  it('resetPassword: should delegate to authProvider.resetPassword', async () => {
    const payload = {
      email: 'test@example.com',
      otp: '123456',
      newPassword: 'NewPassword@123',
      confirmPassword: 'NewPassword@123',
    };

    const result = await controller.resetPassword(payload);
    expect(authProvider.resetPassword).toHaveBeenCalledWith(payload);
    expect(result.success).toBe(true);
  });

  it('freezeAccount: should delegate to authProvider.freezeAccount from POST body or GET query', async () => {
    const mockRes: any = { clearCookie: jest.fn() };

    await controller.freezeAccount({ token: 'freeze-token-123' }, mockRes);
    expect(authProvider.freezeAccount).toHaveBeenCalledWith({ token: 'freeze-token-123' }, mockRes);

    await controller.freezeAccountByQuery('freeze-token-456', mockRes);
    expect(authProvider.freezeAccount).toHaveBeenCalledWith({ token: 'freeze-token-456' }, mockRes);
  });

  it('rollbackEmail: should delegate to authProvider.rollbackEmail from POST body or GET query', async () => {
    const mockRes: any = { clearCookie: jest.fn() };

    await controller.rollbackEmail({ token: 'rollback-token-123' }, mockRes);
    expect(authProvider.rollbackEmail).toHaveBeenCalledWith({ token: 'rollback-token-123' }, mockRes);

    await controller.rollbackEmailByQuery('rollback-token-456', mockRes);
    expect(authProvider.rollbackEmail).toHaveBeenCalledWith({ token: 'rollback-token-456' }, mockRes);
  });
});
