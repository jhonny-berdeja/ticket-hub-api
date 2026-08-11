import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

/**
 * `UsersRepository` is not declared here: it depends on it independently via
 * the `@Global()` `DatabaseModule`, same as `UsersModule`. `AuthService` is
 * exported so `UsersModule` can import `AuthModule` and reuse
 * `hashPassword()` — a one-directional dependency (`UsersModule` →
 * `AuthModule`); `AuthModule` never imports `UsersModule` back, so this
 * stays acyclic.
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
  exports: [AuthService],
})
export class AuthModule {}
