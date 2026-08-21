import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  AssignCinemaAdminDto,
  CreateAuditoriumDto,
  CreateCinemaDto,
  ListCinemasQueryDto,
  UpdateAuditoriumDto,
  UpdateCinemaDto,
} from '@booking-ticket-system/DTOs';
import { JwtAuthGuard, RolesGuard } from '@booking-ticket-system/Guards';
import { CurrentUser, Roles } from '@booking-ticket-system/Decorators';
import { UserRole } from '@booking-ticket-system/Utils';
import { Users } from '@booking-ticket-system/Entities';
import { TransformResponseInterceptor } from '@booking-ticket-system/Common';
import { CatalogProvider, UserProfileProvider } from '../../providers';

@Controller('cinemas')
@UseInterceptors(TransformResponseInterceptor)
export class CatalogCinemasController {
  constructor(
    private readonly catalogProvider: CatalogProvider,
    private readonly userProfileProvider: UserProfileProvider,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createCinema(@Body() body: CreateCinemaDto) {
    if (body.adminUserIds && body.adminUserIds.length > 0) {
      for (const userId of body.adminUserIds) {
        await this.validateCinemaAdminRole(userId);
      }
    }
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
    @CurrentUser() user: Users,
  ) {
    if (user?.role === UserRole.CINEMA_ADMIN) {
      await this.enforceCinemaAdminScope(id, user.id);
    }
    return this.catalogProvider.updateCinema(id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteCinema(@Param('id') id: string) {
    return this.catalogProvider.deleteCinema(id);
  }

  // --- Cinema Admin Management ---
  @Post(':cinemaId/admins')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async assignCinemaAdmin(
    @Param('cinemaId') cinemaId: string,
    @Body() body: AssignCinemaAdminDto,
  ) {
    await this.validateCinemaAdminRole(body.userId);
    return this.catalogProvider.assignCinemaAdmin(cinemaId, body.userId);
  }

  @Delete(':cinemaId/admins/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async removeCinemaAdmin(
    @Param('cinemaId') cinemaId: string,
    @Param('userId') userId: string,
  ) {
    return this.catalogProvider.removeCinemaAdmin(cinemaId, userId);
  }

  @Get(':cinemaId/admins')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CINEMA_ADMIN)
  @HttpCode(HttpStatus.OK)
  async getCinemaAdmins(
    @Param('cinemaId') cinemaId: string,
    @CurrentUser() user: Users,
  ) {
    if (user?.role === UserRole.CINEMA_ADMIN) {
      await this.enforceCinemaAdminScope(cinemaId, user.id);
    }
    return this.catalogProvider.getCinemaAdmins(cinemaId);
  }

  // --- Auditoriums ---
  @Post(':cinemaId/auditoriums')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CINEMA_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createAuditorium(
    @Param('cinemaId') cinemaId: string,
    @Body() body: Omit<CreateAuditoriumDto, 'cinemaId'>,
    @CurrentUser() user: Users,
  ) {
    if (user?.role === UserRole.CINEMA_ADMIN) {
      await this.enforceCinemaAdminScope(cinemaId, user.id);
    }
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

  // --- Helpers ---
  private async validateCinemaAdminRole(userId: string): Promise<void> {
    try {
      const userProfile: any = await this.userProfileProvider.getUserById(userId);
      if (!userProfile) {
        throw new NotFoundException(`User with ID "${userId}" not found`);
      }
      const role = userProfile.role;
      const validRoles = [
        UserRole.CINEMA_ADMIN,
        UserRole.ADMIN,
        UserRole.SUPER_ADMIN,
      ];
      if (!validRoles.includes(role)) {
        throw new BadRequestException(
          `User "${userId}" does not possess the CINEMA_ADMIN or ADMIN role (found: ${role})`,
        );
      }
    } catch (err: any) {
      if (
        err instanceof NotFoundException ||
        err instanceof BadRequestException
      ) {
        throw err;
      }
      throw new BadRequestException(
        `Failed to validate user "${userId}": ${err.message}`,
      );
    }
  }

  private async enforceCinemaAdminScope(
    cinemaId: string,
    userId: string,
  ): Promise<void> {
    const result: any = await this.catalogProvider.getCinemaAdmins(cinemaId);
    const assignedAdminIds: string[] =
      result?.admin_user_ids || result?.adminUserIds || [];
    if (!assignedAdminIds.includes(userId)) {
      throw new ForbiddenException(
        'You are not authorized to view or manage this cinema branch',
      );
    }
  }
}
