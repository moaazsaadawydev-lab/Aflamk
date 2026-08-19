import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  ChangePasswordDto,
  ConfirmEmailChangeDto,
  ForgotPasswordDto,
  FreezeAccountDto,
  RequestEmailChangeDto,
  ResetPasswordDto,
  RollbackEmailDto,
} from '@booking-ticket-system/DTOs';
import { Users } from '@booking-ticket-system/Entities';
import {
  ChangeEmailRateLimitGuard,
  ChangePasswordRateLimitGuard,
  ForgotPasswordRateLimitGuard,
  JwtAuthGuard,
} from '@booking-ticket-system/Guards';
import { CurrentUser } from '@booking-ticket-system/Decorators';
import { TransformResponseInterceptor } from '@booking-ticket-system/Common';
import { AuthProvider } from '../../providers';

@Controller('users/account')
@UseInterceptors(TransformResponseInterceptor)
export class UsersAccountController {
  constructor(private readonly authProvider: AuthProvider) {}

  @Patch(['change-password', 'password/change'])
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

  @Post(['request-email-change', 'email/change/request'])
  @UseGuards(JwtAuthGuard, ChangeEmailRateLimitGuard)
  @HttpCode(HttpStatus.OK)
  async requestChangeEmail(
    @CurrentUser() user: Users,
    @Body() body: RequestEmailChangeDto,
  ) {
    return this.authProvider.requestChangeEmail(user, body);
  }

  @Post(['verify-email-change', 'confirm-email-change'])
  @Patch(['verify-email-change', 'confirm-email-change'])
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async confirmChangeEmail(
    @CurrentUser() user: Users,
    @Body() body: ConfirmEmailChangeDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authProvider.confirmChangeEmail(user, body, response);
  }

  @Post(['forgot-password', 'password/forgot'])
  @UseGuards(ForgotPasswordRateLimitGuard)
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authProvider.forgotPassword(body);
  }

  @Post(['reset-password', 'password/reset'])
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authProvider.resetPassword(body);
  }

  @Post(['freeze', 'account/freeze'])
  @HttpCode(HttpStatus.OK)
  async freezeAccount(
    @Body() body: FreezeAccountDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authProvider.freezeAccount(body, response);
  }

  @Get(['freeze', 'account/freeze'])
  @HttpCode(HttpStatus.OK)
  async freezeAccountByQuery(
    @Query('token') token: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authProvider.freezeAccount({ token }, response);
  }

  @Post(['rollback-email', 'email/rollback'])
  @HttpCode(HttpStatus.OK)
  async rollbackEmail(
    @Body() body: RollbackEmailDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authProvider.rollbackEmail(body, response);
  }

  @Get(['rollback-email', 'email/rollback'])
  @HttpCode(HttpStatus.OK)
  async rollbackEmailByQuery(
    @Query('token') token: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authProvider.rollbackEmail({ token }, response);
  }
}
