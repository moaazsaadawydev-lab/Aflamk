import {
  Body,
  Controller,
  Get,
  Patch,
  Headers,
  Inject,
  Logger,
  Post,
  HttpCode,
  HttpStatus,
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
  UpdateUserProfileDto,
} from '@booking-ticket-system/DTOs';
import { ClientGrpc, ClientProxy } from '@nestjs/microservices';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { lastValueFrom } from 'rxjs';
import { Users } from '@booking-ticket-system/Entities';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '@booking-ticket-system/Guards';
import { CurrentUser } from '@booking-ticket-system/Decorators';
import { TransformResponseInterceptor } from '@booking-ticket-system/Common';
import { MinioService } from '@booking-ticket-system/Storage';
import { randomBytes, randomUUID } from 'crypto';


@Controller()
@UseInterceptors(TransformResponseInterceptor)
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
        objectKey = `temp/${randomUUID()}.raw`;

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

      const result: any = await lastValueFrom(
        this.UsersService.Register(registerPayload),
      );

      return {
        message: result?.message || 'Account created successfully',
        user: result?.user || result,
      };
    } catch (error) {
      if (objectKey) {
        await this.minioService.deleteObject(objectKey).catch(() => null);
      }
      Logger.log('Failed to create account');
      throw new BadRequestException(
        error.message || 'Failed to create account',
      );
    }
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
    @Headers('user-agent') userAgent: string,
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const forwardedFor = req.headers['x-forwarded-for'];
    const rawIp = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor?.split(',')[0] || req.socket?.remoteAddress || req.ip;
    const ipAddress = rawIp ? rawIp.trim() : undefined;

    const loginPayload = {
      ...body,
      userAgent: userAgent || body.userAgent,
      user_agent: userAgent || body.userAgent,
      ipAddress: ipAddress || body.ipAddress,
      ip_address: ipAddress || body.ipAddress,
    };

    const Tokens: any = await lastValueFrom(
      this.UsersService.Login(loginPayload),
    );

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

  @Patch('auth/users/profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @CurrentUser() user: Users,
    @Body() body: UpdateUserProfileDto,
  ) {
    return await lastValueFrom(
      this.UsersService.UpdateProfile({
        user_id: user?.id,
        userId: user?.id,
        ...body,
      }),
    );
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
