import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard, RolesGuard } from '@booking-ticket-system/Guards';
import { UsersAdminController } from '../src/app/api-gateway-service/Controllers/Users/users-admin.controller';
import { AuthProvider } from '../src/app/api-gateway-service/providers';
import { UserStatus } from '@booking-ticket-system/Utils';

describe('UsersAdminController (api-gateway)', () => {
  let controller: UsersAdminController;
  let authProvider: jest.Mocked<AuthProvider>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockAuthProvider = {
      updateUserStatus: jest.fn().mockImplementation((id, body) =>
        Promise.resolve({ success: true, message: 'Status updated', status: body.status }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersAdminController],
      providers: [
        {
          provide: AuthProvider,
          useValue: mockAuthProvider,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersAdminController>(UsersAdminController);
    authProvider = module.get(AuthProvider);
  });

  it('updateUserStatus: should delegate to authProvider.updateUserStatus', async () => {
    const result = await controller.updateUserStatus('usr-1', {
      status: UserStatus.SUSPENDED,
      reason: 'Rule breach',
    });

    expect(authProvider.updateUserStatus).toHaveBeenCalledWith('usr-1', {
      status: UserStatus.SUSPENDED,
      reason: 'Rule breach',
    });
    expect(result.status).toBe(UserStatus.SUSPENDED);
  });

  it('blockUser: should set status to BLOCKED', async () => {
    const result = await controller.blockUser('usr-2', { reason: 'Abuse' });

    expect(authProvider.updateUserStatus).toHaveBeenCalledWith('usr-2', {
      reason: 'Abuse',
      status: UserStatus.BLOCKED,
    });
    expect(result.status).toBe(UserStatus.BLOCKED);
  });

  it('suspendUser: should set status to SUSPENDED', async () => {
    const result = await controller.suspendUser('usr-3', {
      reason: 'Suspicious activity',
      suspendedUntil: '2026-12-31T23:59:59.000Z',
    });

    expect(authProvider.updateUserStatus).toHaveBeenCalledWith('usr-3', {
      reason: 'Suspicious activity',
      suspendedUntil: '2026-12-31T23:59:59.000Z',
      status: UserStatus.SUSPENDED,
    });
    expect(result.status).toBe(UserStatus.SUSPENDED);
  });

  it('unblockUser: should set status to ACTIVE', async () => {
    const result = await controller.unblockUser('usr-4');

    expect(authProvider.updateUserStatus).toHaveBeenCalledWith('usr-4', {
      status: UserStatus.ACTIVE,
    });
    expect(result.status).toBe(UserStatus.ACTIVE);
  });
});
