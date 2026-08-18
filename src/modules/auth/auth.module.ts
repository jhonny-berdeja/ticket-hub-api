import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwksClientService } from './jwks-client.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

/**
 * `UsersRepository` is not declared here: it depends on it independently via
 * the `@Global()` `DatabaseModule`, same as `UsersModule`. `AuthService` is
 * exported so `UsersModule` can import `AuthModule` and reuse
 * `hashPassword()` — a one-directional dependency (`UsersModule` →
 * `AuthModule`); `AuthModule` never imports `UsersModule` back, so this
 * stays acyclic.
 *
 * `jwtModule` still exists solely for `AuthService.login`'s (now-dead,
 * see `AuthController.login`'s comment) signing call -- `JwtAuthGuard`
 * no longer depends on `JwtService` at all, it verifies via
 * `JwksClientService` instead, so `jwtModule` is imported but not
 * re-exported anymore: nothing outside this module needs it.
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
  providers: [AuthService, JwtAuthGuard, RolesGuard, JwksClientService],
  // Exported (not just declared) so that when a guard class is used
  // across a module boundary via `@UseGuards(...)` or `APP_GUARD`, Nest
  // needs its dependencies (`JwksClientService`, `Reflector`) reachable
  // in the *consuming* module's DI graph too, not just AuthModule's own.
  exports: [AuthService, JwtAuthGuard, RolesGuard, JwksClientService],
})
export class AuthModule {}
