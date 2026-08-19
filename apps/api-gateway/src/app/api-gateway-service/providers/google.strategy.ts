import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(private readonly configService: ConfigService) {
    const clientID =
      configService.get<string>('GOOGLE_CLIENT_ID') ||
      process.env.GOOGLE_CLIENT_ID;
    const clientSecret =
      configService.get<string>('GOOGLE_CLIENT_SECRET') ||
      process.env.GOOGLE_CLIENT_SECRET;
    const callbackURL =
      configService.get<string>('GOOGLE_CALLBACK_URL') ||
      process.env.GOOGLE_CALLBACK_URL;

    if (!clientID || !clientSecret || !callbackURL) {
      throw new Error(
        'Missing Google OAuth configuration (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_CALLBACK_URL) in environment variables.',
      );
    }

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile', 'openid'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      const { id, name, emails, photos } = profile;

      const user = {
        googleId: id,
        email: emails && emails[0]?.value ? emails[0].value : '',
        name:
          name && (name.givenName || name.familyName)
            ? `${name.givenName || ''} ${name.familyName || ''}`.trim()
            : profile.displayName || 'Google User',
        avatarUrl: photos && photos[0]?.value ? photos[0].value : null,
      };

      done(null, user);
    } catch (error) {
      this.logger.error(
        `Error validating Google profile: ${(error as Error).message}`,
      );
      done(error as Error, undefined);
    }
  }
}
