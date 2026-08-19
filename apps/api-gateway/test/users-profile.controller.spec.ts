import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '@booking-ticket-system/Guards';
import { UsersProfileController } from '../src/app/api-gateway-service/Controllers/Users/users-profile.controller';
import { UserProfileProvider } from '../src/app/api-gateway-service/providers';
import { Users } from '@booking-ticket-system/Entities';

describe('UsersProfileController (api-gateway)', () => {
  let controller: UsersProfileController;
  let userProfileProvider: jest.Mocked<UserProfileProvider>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockUserProfileProvider = {
      getProfile: jest.fn().mockImplementation((user) => Promise.resolve(user)),
      updateProfile: jest.fn().mockImplementation((user, body) => Promise.resolve({ ...user, ...body })),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersProfileController],
      providers: [
        {
          provide: UserProfileProvider,
          useValue: mockUserProfileProvider,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersProfileController>(UsersProfileController);
    userProfileProvider = module.get(UserProfileProvider);
  });

  it('getProfile: should fetch profile for current user', async () => {
    const mockUser = { id: 'usr-1', email: 'me@example.com' } as Users;

    const result = await controller.getProfile(mockUser);

    expect(userProfileProvider.getProfile).toHaveBeenCalledWith(mockUser);
    expect(result).toEqual(mockUser);
  });

  it('updateProfile: should update profile with body and avatar file', async () => {
    const mockUser = { id: 'usr-1', name: 'Old' } as Users;
    const mockFile: any = { buffer: Buffer.from('img'), mimetype: 'image/webp' };

    const result = await controller.updateProfile(
      mockUser,
      { name: 'New Name' },
      mockFile,
    );

    expect(userProfileProvider.updateProfile).toHaveBeenCalledWith(
      mockUser,
      { name: 'New Name' },
      mockFile,
    );
    expect((result as any).name).toBe('New Name');
  });

  it('uploadAvatar: should delegate avatar upload to userProfileProvider', async () => {
    const mockUser = { id: 'usr-1' } as Users;
    const mockFile: any = { buffer: Buffer.from('img'), mimetype: 'image/png' };

    await controller.uploadAvatar(mockUser, mockFile);

    expect(userProfileProvider.updateProfile).toHaveBeenCalledWith(
      mockUser,
      {},
      mockFile,
    );
  });

  it('deleteAvatar: should set avatarKey to null', async () => {
    const mockUser = { id: 'usr-1' } as Users;

    await controller.deleteAvatar(mockUser);

    expect(userProfileProvider.updateProfile).toHaveBeenCalledWith(
      mockUser,
      { avatarKey: null },
    );
  });

  it('deleteAccount: should initiate account deletion', async () => {
    const mockUser = { id: 'usr-delete' } as Users;

    const result = await controller.deleteAccount(mockUser);

    expect(result).toEqual({
      success: true,
      message: 'Account deletion initiated',
      userId: 'usr-delete',
    });
  });
});
