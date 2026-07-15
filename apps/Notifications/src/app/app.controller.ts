import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { EventPattern, Payload } from '@nestjs/microservices';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @EventPattern('user_created')
  handleUserCreated(
    @Payload() data: { email: string; name: string; code: number },
  ) {
    return this.appService.sendActivationEmail(
      data.email,
      data.name,
      data.code,
    );
  }
}
