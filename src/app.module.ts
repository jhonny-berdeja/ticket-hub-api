import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { EnvModule } from './common/config/env.module';
import { DatabaseModule } from './common/database/database.module';

@Module({
  imports: [EnvModule, DatabaseModule, UsersModule, AuthModule],
})
export class AppModule {}
