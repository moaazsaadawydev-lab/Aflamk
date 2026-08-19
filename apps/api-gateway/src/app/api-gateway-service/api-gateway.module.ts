import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import {
  JwtAuthGuard,
  RolesGuard,
  ChangePasswordRateLimitGuard,
  ForgotPasswordRateLimitGuard,
  ChangeEmailRateLimitGuard,
} from '@booking-ticket-system/Guards';
import { JwtModule } from '@nestjs/jwt';
import { RedisModule } from '@booking-ticket-system/Redis';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StorageModule } from '@booking-ticket-system/Storage';
import { PassportModule } from '@nestjs/passport';
import {
  UsersAuthController,
  UsersRegistrationController,
  UsersAccountController,
  UsersProfileController,
  UsersAdminController,
} from './Controllers/Users';
import {
  AuthProvider,
  RegistrationProvider,
  UserProfileProvider,
  GoogleStrategy,
} from './providers';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'google' }),
    StorageModule,
    RedisModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `libs/env/.env.${process.env.NODE_ENV}`,
    }),
    ClientsModule.registerAsync([
      {
        name: 'USER_SERVICE',
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'user',
            protoPath: join(process.cwd(), 'libs/protos/Users.proto'),
            url:
              process.env.NODE_ENV === 'docker-development'
                ? config.get<string>('USERS_GRPC_DEV_DOC_URL')
                : process.env.NODE_ENV === 'development'
                  ? config.get<string>('USERS_GRPC_DEV_URL')
                  : config.get<string>('USERS_GRPC_DEV_DOC_URL'),
            loader: {
              keepCase: true,
            },
          },
        }),
      },
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('JWT_ACCESS_EXPIRE_IN') as any,
        },
      }),
    }),
  ],
  controllers: [
    UsersAuthController,
    UsersRegistrationController,
    UsersAccountController,
    UsersProfileController,
    UsersAdminController,
  ],
  providers: [
    JwtAuthGuard,
    RolesGuard,
    ChangePasswordRateLimitGuard,
    ForgotPasswordRateLimitGuard,
    ChangeEmailRateLimitGuard,
    AuthProvider,
    RegistrationProvider,
    UserProfileProvider,
    GoogleStrategy,
  ],
})
export class ApiGatewayModule {}
