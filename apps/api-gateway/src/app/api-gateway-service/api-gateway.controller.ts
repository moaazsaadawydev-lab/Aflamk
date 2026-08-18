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
  Query,
  Param,
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
  RequestEmailChangeDto,
  ConfirmEmailChangeDto,
  FreezeAccountDto,
  RollbackEmailDto,
  ResendVerificationCodeDto,
  UpdateUserStatusDto,
} from '@booking-ticket-system/DTOs';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Users } from '@booking-ticket-system/Entities';
import { Request, Response } from 'express';
import { UserRole } from '@booking-ticket-system/Utils';
import {
  JwtAuthGuard,
  RolesGuard,
  ChangePasswordRateLimitGuard,
  ForgotPasswordRateLimitGuard,
  ChangeEmailRateLimitGuard,
} from '@booking-ticket-system/Guards';
import { CurrentUser, Roles } from '@booking-ticket-system/Decorators';
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

  @Post('auth/users/verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmailAlias(@Body() body: VerifyEmailDto) {
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

  @Post('auth/users/email/change/request')
  @UseGuards(JwtAuthGuard, ChangeEmailRateLimitGuard)
  @HttpCode(HttpStatus.OK)
  async requestChangeEmail(
    @CurrentUser() user: Users,
    @Body() body: RequestEmailChangeDto,
  ) {
    return this.authProvider.requestChangeEmail(user, body);
  }

  @Post('auth/users/email/change/confirm')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async confirmChangeEmail(
    @CurrentUser() user: Users,
    @Body() body: ConfirmEmailChangeDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authProvider.confirmChangeEmail(user, body, response);
  }

  @Post('auth/users/account/freeze')
  @HttpCode(HttpStatus.OK)
  async freezeAccount(
    @Body() body: FreezeAccountDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authProvider.freezeAccount(body, response);
  }

  @Get('auth/users/account/freeze')
  @HttpCode(HttpStatus.OK)
  async freezeAccountByQuery(
    @Query('token') token: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authProvider.freezeAccount({ token }, response);
  }

  @Post('auth/users/email/rollback')
  @HttpCode(HttpStatus.OK)
  async rollbackEmail(
    @Body() body: RollbackEmailDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authProvider.rollbackEmail(body, response);
  }

  @Get('auth/users/email/rollback')
  @HttpCode(HttpStatus.OK)
  async rollbackEmailByQuery(
    @Query('token') token: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authProvider.rollbackEmail({ token }, response);
  }

  @Post('auth/users/account/resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerificationCode(
    @Body() body: ResendVerificationCodeDto,
  ) {
    return this.authProvider.resendVerificationCode(body);
  }

  @Patch('admin/users/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateUserStatus(
    @Param('id') id: string,
    @Body() body: UpdateUserStatusDto,
  ) {
    return this.authProvider.updateUserStatus(id, body);
  }

  @Post('auth/users/logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: any,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authProvider.logout(user, response);
  }
}
