import { Test, TestingModule } from '@nestjs/testing';
import { UsersRegistrationController } from '../src/app/api-gateway-service/Controllers/Users/users-registration.controller';
import { AuthProvider, RegistrationProvider } from '../src/app/api-gateway-service/providers';

describe('UsersRegistrationController (api-gateway)', () => {
  let controller: UsersRegistrationController;
  let registrationProvider: jest.Mocked<RegistrationProvider>;
  let authProvider: jest.Mocked<AuthProvider>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockRegistrationProvider = {
      register: jest.fn().mockResolvedValue({
        message: 'Account created successfully',
        user: { id: 'usr-new', email: 'new@example.com' },
      }),
    };

    const mockAuthProvider = {
      verifyEmail: jest.fn().mockResolvedValue({ message: 'Email verified successfully' }),
      resendVerificationCode: jest.fn().mockResolvedValue({
        success: true,
        message: 'Verification code resent successfully.',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersRegistrationController],
      providers: [
        {
          provide: RegistrationProvider,
          useValue: mockRegistrationProvider,
        },
        {
          provide: AuthProvider,
          useValue: mockAuthProvider,
        },
      ],
    }).compile();

    controller = module.get<UsersRegistrationController>(UsersRegistrationController);
    registrationProvider = module.get(RegistrationProvider);
    authProvider = module.get(AuthProvider);
  });

  it('register: should delegate to registrationProvider.register', async () => {
    const mockFile: any = { buffer: Buffer.from('fake-avatar'), mimetype: 'image/jpeg' };
    const mockBody: any = {
      email: 'new@example.com',
      password: 'Password@123',
      name: 'New User',
    };

    const result = await controller.register(mockBody, mockFile);

    expect(registrationProvider.register).toHaveBeenCalledWith(mockBody, mockFile);
    expect(result).toHaveProperty('message', 'Account created successfully');
  });

  it('verifyEmail: should delegate to authProvider.verifyEmail', async () => {
    const result = await controller.verifyEmail({
      email: 'test@example.com',
      code: '123456',
    });

    expect(authProvider.verifyEmail).toHaveBeenCalledWith({
      email: 'test@example.com',
      code: '123456',
    });
    expect(result).toEqual({ message: 'Email verified successfully' });
  });

  it('resendVerificationCode: should delegate to authProvider.resendVerificationCode', async () => {
    const result = await controller.resendVerificationCode({
      email: 'test@example.com',
    });

    expect(authProvider.resendVerificationCode).toHaveBeenCalledWith({
      email: 'test@example.com',
    });
    expect(result.success).toBe(true);
  });
});
