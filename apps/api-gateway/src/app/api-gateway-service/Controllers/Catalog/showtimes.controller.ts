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
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  CreateShowtimeDto,
  GroupedShowtimesQueryDto,
  ListShowtimesQueryDto,
  SetShowtimeSeatPricingsDto,
  UpdateShowtimeDto,
} from '@booking-ticket-system/DTOs';
import { JwtAuthGuard, RolesGuard } from '@booking-ticket-system/Guards';
import { Roles } from '@booking-ticket-system/Decorators';
import { ShowtimeStatus, UserRole } from '@booking-ticket-system/Utils';
import { TransformResponseInterceptor } from '@booking-ticket-system/Common';
import { CatalogProvider } from '../../providers';

@Controller('showtimes')
@UseInterceptors(TransformResponseInterceptor)
export class CatalogShowtimesController {
  constructor(private readonly catalogProvider: CatalogProvider) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CINEMA_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createShowtime(@Body() body: CreateShowtimeDto) {
    return this.catalogProvider.createShowtime(body);
  }

  @Get('grouped')
  @HttpCode(HttpStatus.OK)
  async getShowtimesGroupedByCinema(@Query() query: GroupedShowtimesQueryDto) {
    return this.catalogProvider.getShowtimesGroupedByCinema(query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getShowtimeById(@Param('id') id: string) {
    return this.catalogProvider.getShowtimeById(id);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async listShowtimes(@Query() query: ListShowtimesQueryDto) {
    return this.catalogProvider.listShowtimes(query);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CINEMA_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateShowtime(
    @Param('id') id: string,
    @Body() body: UpdateShowtimeDto,
  ) {
    return this.catalogProvider.updateShowtime(id, body);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CINEMA_ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateShowtimeStatus(
    @Param('id') id: string,
    @Body('status') status: ShowtimeStatus,
  ) {
    return this.catalogProvider.updateShowtimeStatus(id, status);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteShowtime(@Param('id') id: string) {
    return this.catalogProvider.deleteShowtime(id);
  }

  @Put(':id/pricing')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CINEMA_ADMIN)
  @HttpCode(HttpStatus.OK)
  async setShowtimeSeatPricings(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const rawPricings = Array.isArray(body)
      ? body
      : body?.pricings ?? body?.custom_pricings ?? body?.customPricings ?? [];

    return this.catalogProvider.setShowtimeSeatPricings({
      showtimeId: id,
      pricings: rawPricings,
    });
  }
}
