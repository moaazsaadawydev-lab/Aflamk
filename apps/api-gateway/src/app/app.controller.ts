import { Body, Controller, Get, Inject, Logger, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { RegisterDto } from '@booking-ticket-system/DTOs';
import { ClientGrpc } from '@nestjs/microservices';

@Controller()
export class AppController {
  private UsersService: any;

  constructor(
    private readonly appService: AppService,
    @Inject('USER_SERVICE')
    private readonly client: ClientGrpc,
  ) {}

  onModuleInit() {
    this.UsersService = this.client.getService('UsersService');
  }

  @Post('users/register')
  async register(@Body() body: RegisterDto) {
    Logger.log(
      process.env.NODE_ENV,
      '-------------------------------------------------------------------------------------',
    );
    return this.UsersService.Register(body);
  }
}
