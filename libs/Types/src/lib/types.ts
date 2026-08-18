import { UserRole, UserStatus } from '@booking-ticket-system/Utils';

export type AccessPayloadType = {
  id: string;
  role: UserRole;
  status: UserStatus;
  sessionId?: string;
};

export type RefreshPayloadType = {
  id: string;
  sessionId?: string;
};

