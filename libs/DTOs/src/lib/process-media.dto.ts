import { ImageProfileType } from '@booking-ticket-system/Utils';

export class ProcessMediaEventDto {
  entityId!: string;
  temp_object_Key!: string;
  profileType!: ImageProfileType;
}
