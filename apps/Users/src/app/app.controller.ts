import { Controller, Get, Logger } from '@nestjs/common';
import { AppService } from './app.service';
import { GrpcMethod } from '@nestjs/microservices';
import { RegisterDto } from '@booking-ticket-system/DTOs';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @GrpcMethod('UsersService', 'Register')
  register(registerRequest: RegisterDto) {
    Logger.log(registerRequest);
    return this.appService.register(registerRequest);
  }
}
