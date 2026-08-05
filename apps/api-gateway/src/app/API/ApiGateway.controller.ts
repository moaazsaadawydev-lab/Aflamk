import {
  Body,
  Controller,
  Get,
  Inject,
  Logger,
  Post,
  HttpCode,
  HttpStatus,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
  UploadedFile,
  Res,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiGatewayService } from './ApiGateway.service';
import {
  LoginDto,
  NotificationDto,
  RegisterDto,
  VerifyEmailDto,
} from '@booking-ticket-system/DTOs';
import { ClientGrpc, ClientProxy } from '@nestjs/microservices';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs-extra';
import { lastValueFrom } from 'rxjs';
import { Users } from '@booking-ticket-system/Entities';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '@booking-ticket-system/Guards';
import { CurrentUser } from '@booking-ticket-system/Decorators';

@Controller()
export class ApiGatewayController {
  private UsersService: any;

  constructor(
    private readonly apiService: ApiGatewayService,
    @Inject('USER_SERVICE')
    private readonly client: ClientGrpc,
    @Inject('NOTIFICATION_SERVICE')
    private readonly notificationRmqClient: ClientProxy,
  ) {}

  onModuleInit() {
    this.UsersService = this.client.getService('UsersService');
  }

  @Post('auth/users/register')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: './uploads/temp',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async register(
    @Body() body: RegisterDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const cropFields = [
      body.cropX,
      body.cropY,
      body.cropWidth,
      body.cropHeight,
    ];
    const isCropMissing = cropFields.some((v) => v === undefined || v === null);

    if (file && isCropMissing) {
      await fs.remove(file.path).catch(() => null);
      throw new BadRequestException('Crop parameters are required');
    }

    const registerPayload = {
      ...body,
      temp_file_path: file?.path ?? null,
      cropFields,
    };

    await lastValueFrom(this.UsersService.Register(registerPayload));

    return { message: 'User registered successfully' };
  }

  @Post('auth/users/verify')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() body: VerifyEmailDto) {
    return this.UsersService.VerifyEmail(body);
  }

  @Post('auth/users/login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const Tokens: any = await lastValueFrom(this.UsersService.Login(body));

    Logger.log('2. Tokens: ', Tokens);

    const accessToken = Tokens.accessToken || Tokens.access_token;
    const refreshToken = Tokens.refreshToken || Tokens.refresh_token;

    response.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth/users/refresh',
    });

    return {
      accessToken,
    };
  }

  @Get('auth/users/profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getProfile(@CurrentUser() user: Users) {
    const userProfile = await lastValueFrom(
      this.UsersService.CurrentUser({ id: user?.id }),
    );
    return userProfile;
  }

  @Post('send-notification')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  async sendNotification(
    @CurrentUser() user: Users,
    @Body() Dto: NotificationDto,
  ) {
    const { UserId, title, body, type } = Dto;

    return this.notificationRmqClient.emit('send_notification', {
      UserId,
      title,
      body,
      type,
    });
  }

  @Post('auth/users/refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = req.cookies.refreshToken;

    Logger.log(refreshToken);

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const Tokens: any = await lastValueFrom(
      this.UsersService.RefreshToken({ refresh_token: refreshToken }),
    );

    Logger.log('4. Tokens: ', Tokens);

    const newAccessToken = Tokens.accessToken || Tokens.access_token;
    const newRefreshToken = Tokens.refreshToken || Tokens.refresh_token;

    const ref = response.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 2 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth/users/refresh',
    });

    Logger.log(ref);
    Logger.log(newAccessToken);

    return {
      accessToken: newAccessToken,
    };
  }
}
