import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class AppService {
  constructor(private readonly mailerService: MailerService) {}

  async sendActivationEmail(
    email: string,
    name: string,
    activationCode: number,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'تفعيل حسابك - Booking Tickets',
        template: 'ActiveYourEmail',
        context: {
          name,
          activationCode,
        },
      });

      Logger.log(`✅ Activation email sent to ${email}`);
    } catch (error) {
      console.error('❌ Failed to send activation email:', error);
      throw error;
    }
  }
}
