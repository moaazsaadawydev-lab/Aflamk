import { Injectable } from '@nestjs/common';
import {
  LoginDto,
  VerifyEmailDto,
  UpdateUserProfileDto,
} from '@booking-ticket-system/DTOs';
import {
  RegistrationProvider,
  AuthProvider,
  ProfileProvider,
  UpdateUserProvider,
  UpdatePasswordsProvider,
  ChangePasswordPayload,
} from './Providers';

@Injectable()
export class UsersService {
  constructor(
    private readonly registrationProvider: RegistrationProvider,
    private readonly authProvider: AuthProvider,
    private readonly profileProvider: ProfileProvider,
    private readonly updateUserProvider: UpdateUserProvider,
    private readonly updatePasswordsProvider: UpdatePasswordsProvider,
  ) {}

  register(registerDto: any) {
    return this.registrationProvider.register(registerDto);
  }

  updateAvatar(userId: string, mediaUrl: string) {
    return this.profileProvider.updateAvatar(userId, mediaUrl);
  }

  verifyEmail(verifyEmailDto: VerifyEmailDto) {
    return this.registrationProvider.verifyEmail(verifyEmailDto);
  }

  login(loginDto: LoginDto) {
    return this.authProvider.login(loginDto);
  }

  getProfile(userId: string) {
    return this.profileProvider.getProfile(userId);
  }

  updateProfile(userId: string, updateDto: UpdateUserProfileDto) {
    return this.updateUserProvider.execute(userId, updateDto);
  }

  changePassword(payload: ChangePasswordPayload) {
    return this.updatePasswordsProvider.execute(payload);
  }

  refresh(refreshToken: string) {
    return this.authProvider.refresh(refreshToken);
  }
}
