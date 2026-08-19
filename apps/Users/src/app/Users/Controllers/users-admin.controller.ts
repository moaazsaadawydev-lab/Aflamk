import { Controller, UseInterceptors } from '@nestjs/common';
import { GrpcMethod, Payload } from '@nestjs/microservices';
import { SanitizeUserInterceptor } from '@booking-ticket-system/Common';
import { UserStatus } from '@booking-ticket-system/Utils';
import { UpdateUserStatusPayload } from '@booking-ticket-system/Interfaces';
import { UpdateUserStatusProvider } from '../Providers';

@Controller()
@UseInterceptors(SanitizeUserInterceptor)
export class UsersAdminController {
  constructor(
    private readonly updateUserStatusProvider: UpdateUserStatusProvider,
  ) {}

  @GrpcMethod('UsersService', 'UpdateUserStatus')
  async updateUserStatus(@Payload() data: any): Promise<{
    success: boolean;
    message: string;
    status: UserStatus;
  }> {
    const targetUserId = data?.targetUserId || data?.target_user_id;
    const userStatus = data?.status;
    const reason = data?.reason;
    const suspendedUntil = data?.suspendedUntil || data?.suspended_until;

    const payload: UpdateUserStatusPayload = {
      targetUserId,
      status: userStatus,
      reason,
      suspendedUntil,
    };

    return await this.updateUserStatusProvider.execute(payload);
  }
}
