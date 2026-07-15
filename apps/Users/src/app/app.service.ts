import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { RegisterDto } from '@booking-ticket-system/DTOs';
import { Users } from '@booking-ticket-system/Entities';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
    @Inject('NOTIFICATION_SERVICE')
    private readonly notificationService: ClientProxy,
  ) {}

  async register(registerDto: RegisterDto) {
    const UserExists = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (UserExists) {
      throw new BadRequestException('This Email is already used');
    }

    const code = Math.floor(100000 + Math.random() * 900000);

    const User = this.userRepository.create({
      ...registerDto,
      verificationCode: code,
    });

    await this.userRepository.save(User);

    this.notificationService.emit('user_created', {
      email: User.email,
      name: User.name,
      code,
    });

    return { message: 'User created successfully' };
  }
}
