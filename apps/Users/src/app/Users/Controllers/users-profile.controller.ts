import { Controller, UseInterceptors } from '@nestjs/common';
import { GrpcMethod, Payload, RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { UpdateUserProfileDto } from '@booking-ticket-system/DTOs';
import { SanitizeUserInterceptor } from '@booking-ticket-system/Common';
import { Users } from '@booking-ticket-system/Entities';
import { ProfileProvider, UpdateUserProvider } from '../Providers';

@Controller()
@UseInterceptors(SanitizeUserInterceptor)
export class UsersProfileController {
  constructor(
    private readonly profileProvider: ProfileProvider,
    private readonly updateUserProvider: UpdateUserProvider,
  ) {}

  @GrpcMethod('UsersService', 'CurrentUser')
  async getProfile(@Payload() data: { id: string }): Promise<Users> {
    if (!data?.id) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'User ID is required',
      });
    }
    return await this.profileProvider.getProfile(data.id);
  }

  @GrpcMethod('UsersService', 'UpdateProfile')
  async updateProfile(@Payload() data: any): Promise<Users> {
    const userId = data.userId || data.user_id || data.id;

    if (!userId) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'User ID is required for profile update',
      });
    }

    const updateDto: UpdateUserProfileDto = {
      name: data.name,
      country: data.country,
      birthDate: data.birthDate || data.birth_date,
      tempKey: data.tempKey || data.temp_key,
      cropX: data.cropX ?? data.crop_x,
      cropY: data.cropY ?? data.crop_y,
      cropWidth: data.cropWidth ?? data.crop_width,
      cropHeight: data.cropHeight ?? data.crop_height,
      cropZoom: data.cropZoom ?? data.crop_zoom,
    };

    return await this.updateUserProvider.execute(userId, updateDto);
  }
}
