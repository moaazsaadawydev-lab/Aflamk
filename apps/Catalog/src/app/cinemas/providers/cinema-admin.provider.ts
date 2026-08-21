import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { Cinema, CinemaAdmin } from '@booking-ticket-system/Entities';

@Injectable()
export class CinemaAdminProvider {
  private readonly logger = new Logger(CinemaAdminProvider.name);

  constructor(
    @InjectRepository(Cinema)
    private readonly cinemaRepository: Repository<Cinema>,
    @InjectRepository(CinemaAdmin)
    private readonly cinemaAdminRepository: Repository<CinemaAdmin>,
  ) {}

  async assignAdmin(cinemaId: string, userId: string): Promise<any> {
    if (!cinemaId || !userId) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'cinemaId and userId are required',
      });
    }

    const cinema = await this.cinemaRepository.findOne({
      where: { id: cinemaId },
    });

    if (!cinema) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: `Cinema with ID "${cinemaId}" not found`,
      });
    }

    let adminRecord = await this.cinemaAdminRepository.findOne({
      where: { cinemaId, userId },
    });

    if (!adminRecord) {
      adminRecord = this.cinemaAdminRepository.create({
        cinemaId,
        userId,
      });
      adminRecord = await this.cinemaAdminRepository.save(adminRecord);
      this.logger.log(
        `Assigned user "${userId}" as admin for cinema "${cinema.name}" (${cinemaId})`,
      );
    }

    return {
      id: adminRecord.id,
      cinema_id: adminRecord.cinemaId,
      user_id: adminRecord.userId,
      created_at: adminRecord.createdAt?.toISOString(),
    };
  }

  async removeAdmin(cinemaId: string, userId: string): Promise<any> {
    if (!cinemaId || !userId) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'cinemaId and userId are required',
      });
    }

    const result = await this.cinemaAdminRepository.delete({
      cinemaId,
      userId,
    });

    if (result.affected === 0) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: `Admin assignment for user "${userId}" and cinema "${cinemaId}" not found`,
      });
    }

    this.logger.log(
      `Removed admin user "${userId}" from cinema "${cinemaId}"`,
    );

    return {
      success: true,
      message: 'Admin removed successfully',
    };
  }

  async getAdmins(cinemaId: string): Promise<any> {
    if (!cinemaId) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'cinemaId is required',
      });
    }

    const admins = await this.cinemaAdminRepository.find({
      where: { cinemaId },
    });

    return {
      admin_user_ids: admins.map((a) => a.userId),
    };
  }
}
