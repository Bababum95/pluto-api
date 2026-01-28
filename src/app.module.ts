import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CurrencyModule } from './currency/currency.module';
import { RateModule } from './rate/rate.module';

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
    CurrencyModule,
    RateModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
