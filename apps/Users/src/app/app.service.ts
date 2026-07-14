import { Injectable } from '@nestjs/common';
import { RegisterDto } from '@booking-ticket-system/DTOs';

@Injectable()
export class AppService {
  register(registerDto: RegisterDto) {
    console.log('registerDto', registerDto);
    return { message: 'User registered successfully' };
  }
}
