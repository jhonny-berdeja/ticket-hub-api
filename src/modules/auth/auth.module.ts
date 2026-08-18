import { Module } from '@nestjs/common';
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
 * No `JwtModule` here anymore: that was only for the now-removed local
 * `login`'s signing call. `JwtAuthGuard` never depended on `JwtService`
 * at all -- it verifies via `JwksClientService`, fetching auth-api's
 * public key instead of holding any secret of its own.
 */
@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, RolesGuard, JwksClientService],
  // Exported (not just declared) so that when a guard class is used
  // across a module boundary via `@UseGuards(...)` or `APP_GUARD`, Nest
  // needs its dependencies (`JwksClientService`, `Reflector`) reachable
  // in the *consuming* module's DI graph too, not just AuthModule's own.
  exports: [AuthService, JwtAuthGuard, RolesGuard, JwksClientService],
})
export class AuthModule {}
