import { Injectable } from '@nestjs/common';
import { Users } from '@booking-ticket-system/Entities';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';

@Injectable()
export class ProfileProvider {
  constructor(
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
  ) {}

  async getProfile(userId: string): Promise<Users> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: 'User not found',
      });
    }

    return user;
  }

  async updateAvatar(
    userId: string,
    mediaUrl: string,
  ): Promise<{ message: string }> {
    const result = await this.userRepository.update(
      { id: userId },
      { avatarKey: mediaUrl },
    );

    if (result.affected === 0) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: 'User not found',
      });
    }

    return { message: 'Avatar updated successfully' };
  }
}

