import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UpdateUserProfileDto } from '@booking-ticket-system/DTOs';
import { Users } from '@booking-ticket-system/Entities';
import { JwtAuthGuard } from '@booking-ticket-system/Guards';
import { CurrentUser } from '@booking-ticket-system/Decorators';
import { TransformResponseInterceptor } from '@booking-ticket-system/Common';
import { UserProfileProvider } from '../../providers';

@Controller('users/profile')
@UseInterceptors(TransformResponseInterceptor)
export class UsersProfileController {
  constructor(private readonly userProfileProvider: UserProfileProvider) {}

  @Get(['me', ''])
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getProfile(@CurrentUser() user: Users) {
    return this.userProfileProvider.getProfile(user);
  }

  @Patch(['me', 'update', ''])
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

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadAvatar(
    @CurrentUser() user: Users,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.userProfileProvider.updateProfile(user, {}, file);
  }

  @Delete('avatar')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteAvatar(@CurrentUser() user: Users) {
    return this.userProfileProvider.updateProfile(user, {
      avatarKey: null,
    } as any);
  }

  @Delete('account')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteAccount(@CurrentUser() user: Users) {
    return {
      success: true,
      message: 'Account deletion initiated',
      userId: user?.id,
    };
  }
}
