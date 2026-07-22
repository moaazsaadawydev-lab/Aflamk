import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { RegisterDto } from '@booking-ticket-system/DTOs';
import { Users } from '@booking-ticket-system/Entities';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { Country, UserGender } from '@booking-ticket-system/Utils';
import * as bcrypt from 'bcryptjs';
import { randomInt, createHash } from 'crypto';
import { VERIFICATION_CODE_EXPIRY_MS } from '@booking-ticket-system/Constants';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
    @Inject('NOTIFICATION_SERVICE')
    private readonly notificationService: ClientProxy,
  ) {}

  async register(registerDto: RegisterDto) {
    const normalizedEmail = registerDto.email.trim().toLowerCase();

    const userExists = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (userExists) {
      throw new BadRequestException('This Email is already used');
    }

    const code = randomInt(100000, 1000000);

    const [passwordHash, verificationCodeHash] = await Promise.all([
      bcrypt.hash(registerDto.password, 10),
      Promise.resolve(
        createHash('sha256').update(code.toString()).digest('hex'),
      ),
    ]);

    const user = this.userRepository.create({
      name: registerDto.name,
      email: normalizedEmail,
      password: passwordHash,
      age: registerDto.age,
      gender: registerDto.gender as UserGender,
      country: registerDto.country as Country,
      verificationCode: verificationCodeHash,
      verificationCodeExpiresAt: new Date(
        Date.now() + VERIFICATION_CODE_EXPIRY_MS,
      ),
    });

    await this.userRepository.save(user);

    this.notificationService.emit('user_created', {
      email: user.email,
      name: user.name,
      code,
    });

    return { message: 'User created successfully' };
  }
}
