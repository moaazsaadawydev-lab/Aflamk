import {
  BadGatewayException,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { randomUUID } from 'crypto';
import { Users } from '@booking-ticket-system/Entities';
import { UpdateUserProfileDto } from '@booking-ticket-system/DTOs';
import { MinioService } from '@booking-ticket-system/Storage';

@Injectable()
export class UserProfileProvider implements OnModuleInit {
  private usersService: any;

  constructor(
    @Inject('USER_SERVICE') private readonly client: ClientGrpc,
    private readonly minioService: MinioService,
  ) {}

  onModuleInit() {
    this.usersService = this.client.getService('UsersService');
  }

  async getProfile(user: Users) {
    const userProfile = await lastValueFrom(
      this.usersService.CurrentUser({ id: user?.id }),
    );
    return userProfile;
  }

  async getUserById(userId: string) {
    return await lastValueFrom(
      this.usersService.CurrentUser({ id: userId }),
    );
  }

  async updateProfile(
    user: Users,
    body: UpdateUserProfileDto,
    file?: Express.Multer.File,
  ) {
    let tempKey: string | null = null;

    if (file) {
      try {
        tempKey = `temp/${randomUUID()}.raw`;

        await this.minioService.uploadBuffer(
          file.buffer,
          tempKey,
          file.mimetype,
        );
      } catch (error: any) {
        Logger.error(
          `Failed to upload temp profile file to MinIO: ${error.message}`,
        );
        throw new BadGatewayException(
          'Failed to process uploaded image storage',
        );
      }
    }

    try {
      return await lastValueFrom(
        this.usersService.UpdateProfile({
          user_id: user?.id,
          userId: user?.id,
          temp_key: tempKey,
          tempKey: tempKey,
          ...body,
          birth_date: body.birthDate || (body as any).birth_date,
          birthDate: body.birthDate || (body as any).birth_date,
        }),
      );
    } catch (error) {
      if (tempKey) {
        await this.minioService.deleteObject(tempKey).catch(() => null);
      }
      throw error;
    }
  }
}
