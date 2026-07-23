import { ImageProfileType } from '@booking-ticket-system/Utils';

export class ProcessMediaEventDto {
  entityId!: string;
  tempFilePath!: string;
  profileType!: ImageProfileType;
}
