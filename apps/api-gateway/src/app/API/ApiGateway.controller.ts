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
import { diskStorage, memoryStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs-extra';
import { lastValueFrom } from 'rxjs';
import { Users } from '@booking-ticket-system/Entities';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '@booking-ticket-system/Guards';
import { CurrentUser } from '@booking-ticket-system/Decorators';
import { MinioService } from '@booking-ticket-system/Storage';
import { randomBytes } from 'crypto';

@Controller()
export class ApiGatewayController {
  private UsersService: any;

  constructor(
    private readonly apiService: ApiGatewayService,
    @Inject('USER_SERVICE')
    private readonly client: ClientGrpc,
    @Inject('NOTIFICATION_SERVICE')
    private readonly notificationRmqClient: ClientProxy,
    private readonly minioService: MinioService,
  ) {}

  onModuleInit() {
    this.UsersService = this.client.getService('UsersService');
  }

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
    const cropFields = [body.x, body.y, body.width, body.height];
    const isCropMissing = cropFields.some((v) => v === undefined || v === null);

    if (file && isCropMissing) {
      Logger.log('Crop parameters are required');
      throw new BadRequestException('Crop parameters are required');
    }

    let objectKey: string | null = null;

    if (file) {
      try {
        objectKey = `temp/${randomBytes(16).toString('hex')}${extname(file.originalname)}`;
        await this.minioService.uploadBuffer(
          file.buffer,
          objectKey,
          file.mimetype,
        );
      } catch (error) {
        Logger.error(`Failed to upload temp file to MinIO: ${error.message}`);
        throw new BadRequestException('Failed to process uploaded image');
      }
    }

    try {
      const registerPayload = {
        ...body,
        temp_object_key: objectKey,
      };

      await lastValueFrom(this.UsersService.Register(registerPayload));
    } catch (error) {
      if (objectKey) {
        await this.minioService.deleteObject(objectKey).catch(() => null);
      }
      Logger.log('Failed to create account');
      throw new BadRequestException(
        error.message || 'Failed to create account',
      );
    }

    return { message: 'Account created successfully' };
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

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const Tokens: any = await lastValueFrom(
      this.UsersService.RefreshToken({ refresh_token: refreshToken }),
    );

    const newAccessToken = Tokens.accessToken || Tokens.access_token;
    const newRefreshToken = Tokens.refreshToken || Tokens.refresh_token;

    const ref = response.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 2 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth/users/refresh',
    });

    return {
      accessToken: newAccessToken,
    };
  }
}
