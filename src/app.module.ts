import path from 'path';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { I18nModule, AcceptLanguageResolver } from 'nestjs-i18n';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CurrencyModule } from './currency/currency.module';
import { RateModule } from './rate/rate.module';
import { UsersModule } from './user/users.module';
import { AuthModule } from './auth/auth.module';
import { CategoryModule } from './category/category.module';
import { AccountModule } from './account/account.module';
import { SettingsModule } from './settings/settings.module';
import { TagModule } from './tag/tag.module';
import { TransactionModule } from './transaction/transaction.module';
import { TransferModule } from './transfer/transfer.module';
import { JwtAuthGlobalGuard } from './auth/jwt-auth.global.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        dbName: configService.get<string>('MONGODB_DB_NAME') || 'pluto',
      }),
    }),
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      resolvers: [new AcceptLanguageResolver()],
      loaderOptions: {
        path: path.join(process.cwd(), 'i18n'),
        watch: true,
      },
    }),
    CurrencyModule,
    RateModule,
    UsersModule,
    AuthModule,
    CategoryModule,
    AccountModule,
    SettingsModule,
    TagModule,
    TransactionModule,
    TransferModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: JwtAuthGlobalGuard }],
})
export class AppModule {}
