import { Injectable } from '@nestjs/common';
import { LoginDto, VerifyEmailDto } from '@booking-ticket-system/DTOs';
import {
  RegistrationProvider,
  AuthProvider,
  ProfileProvider,
} from './Providers';

@Injectable()
export class UsersService {
  constructor(
    private readonly registrationProvider: RegistrationProvider,
    private readonly authProvider: AuthProvider,
    private readonly profileProvider: ProfileProvider,
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

  refresh(refreshToken: string) {
    return this.authProvider.refresh(refreshToken);
  }
}
