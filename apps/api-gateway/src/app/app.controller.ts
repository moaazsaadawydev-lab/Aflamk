import {
  Body,
  Controller,
  Get,
  Inject,
  Logger,
  Post,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AppService } from './app.service';
import { RegisterDto, VerifyEmailDto } from '@booking-ticket-system/DTOs';
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

  @Post('auth/users/register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: RegisterDto) {
    return this.UsersService.Register(body);
  }

  @Post('auth/users/verify')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() body: VerifyEmailDto) {
    return this.UsersService.VerifyEmail(body);
  }
}
