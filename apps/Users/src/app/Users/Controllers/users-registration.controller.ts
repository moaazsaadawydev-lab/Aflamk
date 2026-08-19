import { Controller, UseInterceptors } from '@nestjs/common';
import { GrpcMethod, Payload, RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { VerifyEmailDto } from '@booking-ticket-system/DTOs';
import { SanitizeUserInterceptor } from '@booking-ticket-system/Common';
import {
  RegistrationProvider,
  ResendVerificationCodeProvider,
} from '../Providers';

@Controller()
@UseInterceptors(SanitizeUserInterceptor)
export class UsersRegistrationController {
  constructor(
    private readonly registrationProvider: RegistrationProvider,
    private readonly resendVerificationCodeProvider: ResendVerificationCodeProvider,
  ) {}

  @GrpcMethod('UsersService', 'Register')
  async register(@Payload() data: any): Promise<any> {
    return await this.registrationProvider.register(data);
  }

  @GrpcMethod('UsersService', 'VerifyEmail')
  async verifyEmail(
    @Payload() verifyEmailDto: VerifyEmailDto,
  ): Promise<{ message: string }> {
    return await this.registrationProvider.verifyEmail(verifyEmailDto);
  }

  @GrpcMethod('UsersService', 'ResendVerificationCode')
  async resendVerificationCode(
    @Payload() data: { email?: string },
  ): Promise<{ success: boolean; message: string }> {
    if (!data?.email) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Email is required',
      });
    }
    return await this.resendVerificationCodeProvider.execute({
      email: data.email,
    });
  }
}
