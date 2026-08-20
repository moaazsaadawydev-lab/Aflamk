import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  CreateAuditoriumDto,
  CreateCinemaDto,
  ListCinemasQueryDto,
  UpdateAuditoriumDto,
  UpdateCinemaDto,
} from '@booking-ticket-system/DTOs';
import { JwtAuthGuard, RolesGuard } from '@booking-ticket-system/Guards';
import { Roles } from '@booking-ticket-system/Decorators';
import { UserRole } from '@booking-ticket-system/Utils';
import { TransformResponseInterceptor } from '@booking-ticket-system/Common';
import { CatalogProvider } from '../../providers';

@Controller('cinemas')
@UseInterceptors(TransformResponseInterceptor)
export class CatalogCinemasController {
  constructor(private readonly catalogProvider: CatalogProvider) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createCinema(@Body() body: CreateCinemaDto) {
    return this.catalogProvider.createCinema(body);
  }

  @Get('slug/:slug')
  @HttpCode(HttpStatus.OK)
  async getCinemaBySlug(@Param('slug') slug: string) {
    return this.catalogProvider.getCinemaBySlug(slug);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getCinemaById(@Param('id') id: string) {
    return this.catalogProvider.getCinemaById(id);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async listCinemas(@Query() query: ListCinemasQueryDto) {
    return this.catalogProvider.listCinemas(query);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CINEMA_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateCinema(
    @Param('id') id: string,
    @Body() body: UpdateCinemaDto,
  ) {
    return this.catalogProvider.updateCinema(id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteCinema(@Param('id') id: string) {
    return this.catalogProvider.deleteCinema(id);
  }

  // --- Auditoriums ---
  @Post(':cinemaId/auditoriums')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CINEMA_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createAuditorium(
    @Param('cinemaId') cinemaId: string,
    @Body() body: Omit<CreateAuditoriumDto, 'cinemaId'>,
  ) {
    return this.catalogProvider.createAuditorium({
      ...body,
      cinemaId,
    } as CreateAuditoriumDto);
  }

  @Get(':cinemaId/auditoriums')
  @HttpCode(HttpStatus.OK)
  async listAuditoriumsByCinema(@Param('cinemaId') cinemaId: string) {
    return this.catalogProvider.listAuditoriumsByCinema(cinemaId);
  }

  @Get('auditoriums/:id')
  @HttpCode(HttpStatus.OK)
  async getAuditoriumById(@Param('id') id: string) {
    return this.catalogProvider.getAuditoriumById(id);
  }

  @Patch('auditoriums/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CINEMA_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateAuditorium(
    @Param('id') id: string,
    @Body() body: UpdateAuditoriumDto,
  ) {
    return this.catalogProvider.updateAuditorium(id, body);
  }

  @Delete('auditoriums/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteAuditorium(@Param('id') id: string) {
    return this.catalogProvider.deleteAuditorium(id);
  }
}
