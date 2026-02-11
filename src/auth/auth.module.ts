import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { UsersModule } from '../user/users.module';
import { SettingsModule } from '../settings/settings.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LocalStrategy } from './local.strategy';
import { JwtStrategy } from './jwt.strategy';

/** Default token TTL: 7 days in seconds */
const DEFAULT_JWT_EXPIRES_IN_SEC = 7 * 24 * 60 * 60;

@Module({
  imports: [
    UsersModule,
    SettingsModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') ?? 'default-secret',
        signOptions: {
          expiresIn:
            configService.get<number>('JWT_EXPIRES_IN') ??
            DEFAULT_JWT_EXPIRES_IN_SEC,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
