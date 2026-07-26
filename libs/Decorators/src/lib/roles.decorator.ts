import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from '@booking-ticket-system/Constants';

export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
