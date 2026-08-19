import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  RegisterDto,
  ResendVerificationCodeDto,
  VerifyEmailDto,
} from '@booking-ticket-system/DTOs';
import { TransformResponseInterceptor } from '@booking-ticket-system/Common';
import { AuthProvider, RegistrationProvider } from '../../providers';

@Controller('users/auth')
@UseInterceptors(TransformResponseInterceptor)
export class UsersRegistrationController {
  constructor(
    private readonly registrationProvider: RegistrationProvider,
    private readonly authProvider: AuthProvider,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async register(
    @Body() body: RegisterDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.registrationProvider.register(body, file);
  }

  @Post(['verify-otp', 'verify', 'verify-email'])
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() body: VerifyEmailDto) {
    return this.authProvider.verifyEmail(body);
  }

  @Post(['resend-otp', 'resend-verification'])
  @HttpCode(HttpStatus.OK)
  async resendVerificationCode(@Body() body: ResendVerificationCodeDto) {
    return this.authProvider.resendVerificationCode(body);
  }
}
