import { Controller, UseInterceptors } from '@nestjs/common';
import { GrpcMethod, Payload, RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { SanitizeUserInterceptor } from '@booking-ticket-system/Common';
import {
  ChangePasswordPayload,
  ConfirmChangeEmailPayload,
  RequestChangeEmailPayload,
  ResetPasswordPayload,
} from '@booking-ticket-system/Interfaces';
import {
  ConfirmChangeEmailProvider,
  ForgotPasswordProvider,
  FreezeAccountProvider,
  RequestChangeEmailProvider,
  ResetPasswordProvider,
  RollbackEmailProvider,
  UpdatePasswordsProvider,
} from '../Providers';

@Controller()
@UseInterceptors(SanitizeUserInterceptor)
export class UsersAccountController {
  constructor(
    private readonly updatePasswordsProvider: UpdatePasswordsProvider,
    private readonly forgotPasswordProvider: ForgotPasswordProvider,
    private readonly resetPasswordProvider: ResetPasswordProvider,
    private readonly requestChangeEmailProvider: RequestChangeEmailProvider,
    private readonly confirmChangeEmailProvider: ConfirmChangeEmailProvider,
    private readonly freezeAccountProvider: FreezeAccountProvider,
    private readonly rollbackEmailProvider: RollbackEmailProvider,
  ) {}

  @GrpcMethod('UsersService', 'ChangePassword')
  async changePassword(
    @Payload() data: any,
  ): Promise<{ success: boolean; message: string }> {
    const userId = data.userId || data.user_id;
    const oldPassword = data.oldPassword || data.old_password;
    const newPassword = data.newPassword || data.new_password;
    const confirmPassword = data.confirmPassword || data.confirm_password;
    const userAgent = data.userAgent || data.user_agent;
    const ipAddress = data.ipAddress || data.ip_address;

    if (!userId) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'User ID is required for password change',
      });
    }
    if (!newPassword) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'New password is required',
      });
    }

    const payload: ChangePasswordPayload = {
      userId,
      oldPassword,
      newPassword,
      confirmPassword,
      userAgent,
      ipAddress,
    };

    return await this.updatePasswordsProvider.execute(payload);
  }

  @GrpcMethod('UsersService', 'ForgotPassword')
  async forgotPassword(
    @Payload() data: { email?: string },
  ): Promise<{ success: boolean; message: string }> {
    if (!data?.email) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Email is required',
      });
    }

    return await this.forgotPasswordProvider.execute(data.email);
  }

  @GrpcMethod('UsersService', 'ResetPassword')
  async resetPassword(
    @Payload() data: any,
  ): Promise<{ success: boolean; message: string }> {
    const email = data?.email;
    const otp = data?.otp;
    const newPassword = data?.newPassword || data?.new_password;
    const confirmPassword = data?.confirmPassword || data?.confirm_password;

    if (!email) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Email is required',
      });
    }

    if (!otp) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'OTP is required',
      });
    }

    if (!newPassword) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'New password is required',
      });
    }

    const payload: ResetPasswordPayload = {
      email,
      otp,
      newPassword,
      confirmPassword,
    };

    return await this.resetPasswordProvider.execute(payload);
  }

  @GrpcMethod('UsersService', 'RequestChangeEmail')
  async requestChangeEmail(
    @Payload() data: any,
  ): Promise<{ success: boolean; message: string }> {
    const userId = data?.userId || data?.user_id;
    const currentPassword = data?.currentPassword || data?.current_password;
    const newEmail = data?.newEmail || data?.new_email;

    const payload: RequestChangeEmailPayload = {
      userId,
      currentPassword,
      newEmail,
    };

    return await this.requestChangeEmailProvider.execute(payload);
  }

  @GrpcMethod('UsersService', 'ConfirmChangeEmail')
  async confirmChangeEmail(
    @Payload() data: any,
  ): Promise<{ success: boolean; message: string }> {
    const userId = data?.userId || data?.user_id;
    const code = data?.code;

    const payload: ConfirmChangeEmailPayload = {
      userId,
      code,
    };

    return await this.confirmChangeEmailProvider.execute(payload);
  }

  @GrpcMethod('UsersService', 'FreezeAccount')
  async freezeAccount(
    @Payload() data: { token?: string },
  ): Promise<{ success: boolean; message: string }> {
    if (!data?.token) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Token is required',
      });
    }
    return await this.freezeAccountProvider.execute(data.token);
  }

  @GrpcMethod('UsersService', 'RollbackEmail')
  async rollbackEmail(
    @Payload() data: { token?: string },
  ): Promise<{ success: boolean; message: string }> {
    if (!data?.token) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Token is required',
      });
    }
    return await this.rollbackEmailProvider.execute(data.token);
  }
}
