import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UpdateUserStatusDto } from '@booking-ticket-system/DTOs';
import { JwtAuthGuard, RolesGuard } from '@booking-ticket-system/Guards';
import { Roles } from '@booking-ticket-system/Decorators';
import { UserRole, UserStatus } from '@booking-ticket-system/Utils';
import { TransformResponseInterceptor } from '@booking-ticket-system/Common';
import { AuthProvider } from '../../providers';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@UseInterceptors(TransformResponseInterceptor)
export class UsersAdminController {
  constructor(private readonly authProvider: AuthProvider) {}

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  async updateUserStatus(
    @Param('id') id: string,
    @Body() body: UpdateUserStatusDto,
  ) {
    return this.authProvider.updateUserStatus(id, body);
  }

  @Patch(':id/block')
  @HttpCode(HttpStatus.OK)
  async blockUser(
    @Param('id') id: string,
    @Body() body?: Partial<UpdateUserStatusDto>,
  ) {
    return this.authProvider.updateUserStatus(id, {
      ...body,
      status: UserStatus.BLOCKED,
    } as UpdateUserStatusDto);
  }

  @Patch(':id/suspend')
  @HttpCode(HttpStatus.OK)
  async suspendUser(
    @Param('id') id: string,
    @Body() body: Partial<UpdateUserStatusDto>,
  ) {
    return this.authProvider.updateUserStatus(id, {
      ...body,
      status: UserStatus.SUSPENDED,
    } as UpdateUserStatusDto);
  }

  @Patch(':id/unblock')
  @HttpCode(HttpStatus.OK)
  async unblockUser(
    @Param('id') id: string,
    @Body() body?: Partial<UpdateUserStatusDto>,
  ) {
    return this.authProvider.updateUserStatus(id, {
      ...body,
      status: UserStatus.ACTIVE,
    } as UpdateUserStatusDto);
  }
}
