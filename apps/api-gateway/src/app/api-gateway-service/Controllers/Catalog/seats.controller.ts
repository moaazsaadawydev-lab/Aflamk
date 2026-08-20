import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  BatchUpdateSeatsDto,
  GenerateSeatLayoutDto,
  UpdateSeatDto,
} from '@booking-ticket-system/DTOs';
import { JwtAuthGuard, RolesGuard } from '@booking-ticket-system/Guards';
import { Roles } from '@booking-ticket-system/Decorators';
import { UserRole } from '@booking-ticket-system/Utils';
import { TransformResponseInterceptor } from '@booking-ticket-system/Common';
import { CatalogProvider } from '../../providers';

@Controller('seats')
@UseInterceptors(TransformResponseInterceptor)
export class CatalogSeatsController {
  constructor(private readonly catalogProvider: CatalogProvider) {}

  @Post('generate-layout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CINEMA_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async generateSeatLayout(@Body() body: GenerateSeatLayoutDto) {
    return this.catalogProvider.generateSeatLayout(body);
  }

  @Get('auditorium/:auditoriumId')
  @HttpCode(HttpStatus.OK)
  async getSeatsByAuditorium(@Param('auditoriumId') auditoriumId: string) {
    return this.catalogProvider.getSeatsByAuditorium(auditoriumId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CINEMA_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateSeat(
    @Param('id') id: string,
    @Body() body: UpdateSeatDto,
  ) {
    return this.catalogProvider.updateSeat(id, body);
  }

  @Patch('auditorium/:auditoriumId/batch')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CINEMA_ADMIN)
  @HttpCode(HttpStatus.OK)
  async batchUpdateSeats(
    @Param('auditoriumId') auditoriumId: string,
    @Body() body: Omit<BatchUpdateSeatsDto, 'auditoriumId'>,
  ) {
    return this.catalogProvider.batchUpdateSeats({
      ...body,
      auditoriumId,
    } as BatchUpdateSeatsDto);
  }
}
