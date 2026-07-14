import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AppService {
  sendEmail(email: string, name: string) {
    Logger.log(`sendEmail`, `[SendEmail]: ${email}, ${name}`);
  }
}
