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
} from '@nestjs/common';
import { AppService } from './app.service';
import {
  LoginDto,
  RegisterDto,
  VerifyEmailDto,
} from '@booking-ticket-system/DTOs';
import { ClientGrpc, ClientProxy } from '@nestjs/microservices';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs-extra';
import { ImageProfileType } from '@booking-ticket-system/Utils';
import { lastValueFrom } from 'rxjs';
import { Users } from '@booking-ticket-system/Entities';
import { Response } from 'express';
import { JwtAuthGuard } from '@booking-ticket-system/Guards';
import { CurrentUser } from '@booking-ticket-system/Decorators';

@Controller()
export class AppController {
  private UsersService: any;

  constructor(
    private readonly appService: AppService,
    @Inject('USER_SERVICE')
    private readonly client: ClientGrpc,
    @Inject('MEDIA_SERVICE')
    private readonly mediaRmqClient: ClientProxy,
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
    try {
      const user: Users = await lastValueFrom(this.UsersService.Register(body));

      if (file) {
        if (body.cropX && body.cropY && body.cropWidth && body.cropHeight) {
          this.mediaRmqClient.emit('process_profile_photo', {
            entityId: user?.id,
            tempFilePath: file.path,
            profileType: ImageProfileType.AVATAR,
            crop: {
              x: body.cropX,
              y: body.cropY,
              width: body.cropWidth,
              height: body.cropHeight,
            },
          });
        } else {
          throw new BadRequestException('Crop parameters are required');
        }
      }
    } catch (error) {
      if (file && file.path) {
        await fs.remove(file.path).catch(() => null);
      }
      Logger.log('Failed to create account');
      throw new BadRequestException(
        error.message || 'Failed to create account',
      );
    }

    return {
      message: 'Account created successfully',
    };
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

    response.cookie('refreshToken', Tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/auth/refresh',
    });

    return {
      accessToken: Tokens.accessToken,
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
}
