import { UserRole } from '@booking-ticket-system/Utils';

export type AccessPayloadType = {
  id: string;
  role: UserRole;
};

export type RefreshPayloadType = {
  id: string;
  sessionId?: string;
};

