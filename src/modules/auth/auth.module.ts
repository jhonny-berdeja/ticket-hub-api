import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

/**
 * `UsersRepository` is not declared here: it depends on it independently via
 * the `@Global()` `DatabaseModule`, same as `UsersModule`. `AuthService` is
 * exported so `UsersModule` can import `AuthModule` and reuse
 * `hashPassword()` — a one-directional dependency (`UsersModule` →
 * `AuthModule`); `AuthModule` never imports `UsersModule` back, so this
 * stays acyclic.
 */
const jwtModule = JwtModule.registerAsync({
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    secret: configService.get<string>('JWT_SECRET'),
  }),
});

@Module({
  imports: [jwtModule],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, RolesGuard],
  // `jwtModule` is re-exported (not just imported) so that `JwtService`
  // itself is resolvable in any module that imports `AuthModule` -
  // `JwtAuthGuard` (also exported below) depends on `JwtService`, and
  // when a guard class is used across a module boundary via
  // `@UseGuards(JwtAuthGuard)`, Nest needs that dependency reachable in
  // the *consuming* module's DI graph too, not just AuthModule's own.
  exports: [AuthService, JwtAuthGuard, RolesGuard, jwtModule],
})
export class AuthModule {}
