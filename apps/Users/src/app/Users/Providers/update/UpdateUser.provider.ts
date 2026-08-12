import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Users } from '@booking-ticket-system/Entities';
import { UpdateUserProfileDto } from '@booking-ticket-system/DTOs';

@Injectable()
export class UpdateUserProvider {
  constructor(
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
  ) {}

  async execute(
    userId: string,
    updateDto: UpdateUserProfileDto,
  ): Promise<Users> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { name, country, age } = updateDto;

    if (name !== undefined) {
      user.name = name;
    }
    if (country !== undefined) {
      user.country = country;
    }
    if (age !== undefined) {
      user.age = age;
    }

    return await this.userRepository.save(user);
  }
}
