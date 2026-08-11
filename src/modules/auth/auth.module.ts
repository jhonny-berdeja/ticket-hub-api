import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

/**
 * `UsersRepository` is not declared here: like `UsersModule`, it depends on
 * the shared `UsersRepository` independently via the `@Global()`
 * `DatabaseModule` — `AuthModule` and `UsersModule` never depend on each
 * other, avoiding a circular import between the two feature modules.
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
