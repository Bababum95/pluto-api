import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';

import { UsersModule } from '../user/users.module.js';
import { AuthModule } from '../auth/auth.module.js';

import { Passkey, PasskeySchema } from './passkey.schema.js';
import { PasskeyService } from './passkey.service.js';
import { PasskeyController } from './passkey.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Passkey.name, schema: PasskeySchema }]),
    ConfigModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [PasskeyController],
  providers: [PasskeyService],
  exports: [PasskeyService],
})
export class PasskeyModule {}
