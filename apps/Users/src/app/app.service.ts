import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { RegisterDto, VerifyEmailDto } from '@booking-ticket-system/DTOs';
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
    Logger.log('The request has been reached to register user');

    const normalizedEmail = registerDto.email.trim().toLowerCase();

    const userExists = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (userExists) {
      throw new BadRequestException('This Email is already used');
    }

    if (registerDto.age < 18) {
      throw new BadRequestException('You must be at least 18 years old');
    }

    const code = randomInt(100000, 1000000).toString();

    const [passwordHash, verificationCodeHash] = await Promise.all([
      bcrypt.hash(registerDto.password, await bcrypt.genSalt(10)),
      bcrypt.hash(code, await bcrypt.genSalt(10)),
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

    return {
      id: user.id,
      message: 'User created successfully',
    };
  }

  async updateAvatar(userId: string, mediaUrl: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    user.avatarKey = mediaUrl;

    await this.userRepository.save(user);

    return { message: 'Avatar updated successfully' };
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const user = await this.userRepository.findOne({
      where: { email: verifyEmailDto.email },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.isVerified) {
      throw new BadRequestException('User is already verified');
    }

    const isCodeMatch = await bcrypt.compare(
      String(verifyEmailDto.code),
      user.verificationCode,
    );

    if (!isCodeMatch) {
      throw new BadRequestException('Invalid verification code');
    }

    if (user.verificationCodeExpiresAt < new Date()) {
      throw new BadRequestException('Verification code expired');
    }

    user.isVerified = true;
    user.verificationCode = null;
    user.verificationCodeExpiresAt = null;

    await this.userRepository.save(user);

    return { message: 'Email verified successfully' };
  }
}
