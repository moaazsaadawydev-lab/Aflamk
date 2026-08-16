import {
  Body,
  Controller,
  Get,
  Patch,
  Headers,
  Logger,
  Post,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  Res,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  LoginDto,
  NotificationDto,
  RegisterDto,
  VerifyEmailDto,
  UpdateUserProfileDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from '@booking-ticket-system/DTOs';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Users } from '@booking-ticket-system/Entities';
import { Request, Response } from 'express';
import {
  JwtAuthGuard,
  ChangePasswordRateLimitGuard,
  ForgotPasswordRateLimitGuard,
} from '@booking-ticket-system/Guards';
import { CurrentUser } from '@booking-ticket-system/Decorators';
import { TransformResponseInterceptor } from '@booking-ticket-system/Common';

import {
  AuthProvider,
  RegistrationProvider,
  UserProfileProvider,
  NotificationProvider,
} from './providers';

@Controller()
@UseInterceptors(TransformResponseInterceptor)
export class ApiGatewayController {
  constructor(
    private readonly authProvider: AuthProvider,
    private readonly registrationProvider: RegistrationProvider,
    private readonly userProfileProvider: UserProfileProvider,
    private readonly notificationProvider: NotificationProvider,
  ) {}

  @Post('auth/users/register')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async register(
    @Body() body: RegisterDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.registrationProvider.register(body, file);
  }

  @Post('auth/users/verify')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() body: VerifyEmailDto) {
    return this.authProvider.verifyEmail(body);
  }

  @Post('auth/users/login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: LoginDto,
    @Headers('user-agent') userAgent: string,
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const ip =
      (req.headers['x-forwarded-for'] as string) ||
      req.socket.remoteAddress ||
      '';

    return this.authProvider.login(body, userAgent, ip, response);
  }

  @Get('auth/users/profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getProfile(@CurrentUser() user: Users) {
    return this.userProfileProvider.getProfile(user);
  }

  @Patch('auth/users/profile/update')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async updateProfile(
    @CurrentUser() user: Users,
    @Body() body: UpdateUserProfileDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.userProfileProvider.updateProfile(user, body, file);
  }

  @Post('send-notification')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  async sendNotification(
    @CurrentUser() user: Users,
    @Body() Dto: NotificationDto,
  ) {
    return this.notificationProvider.sendNotification(user, Dto);
  }

  @Post('auth/users/refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = req.cookies.refreshToken;
    return this.authProvider.refresh(refreshToken, response);
  }

  @Patch('auth/users/password/change')
  @UseGuards(JwtAuthGuard, ChangePasswordRateLimitGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: Users,
    @Body() body: ChangePasswordDto,
    @Headers('user-agent') userAgent: string,
    @Req() req: Request,
  ) {
    const ip =
      (req.headers['x-forwarded-for'] as string) ||
      req.socket.remoteAddress ||
      '';

    return this.authProvider.changePassword(user, body, userAgent, ip);
  }

  @Post('auth/users/password/forgot')
  @UseGuards(ForgotPasswordRateLimitGuard)
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authProvider.forgotPassword(body);
  }

  @Post('auth/users/password/reset')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authProvider.resetPassword(body);
  }
}
