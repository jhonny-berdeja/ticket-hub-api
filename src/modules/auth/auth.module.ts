import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { JwksClientService } from './jwks-client.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

/**
 * No `AuthService` anymore -- it was only `hashPassword()`, used
 * exclusively by `UsersModule`, which is gone too (ticket-hub
 * authenticates against auth-api now; the local `users`/`roles` tables
 * had no other consumer left, see `TicketEntity`'s doc comment for the
 * full history).
 */
@Module({
  controllers: [AuthController],
  providers: [JwtAuthGuard, RolesGuard, JwksClientService],
  // Exported (not just declared) so that when a guard class is used
  // across a module boundary via `@UseGuards(...)` or `APP_GUARD`, Nest
  // needs its dependencies (`JwksClientService`, `Reflector`) reachable
  // in the *consuming* module's DI graph too, not just AuthModule's own.
  exports: [JwtAuthGuard, RolesGuard, JwksClientService],
})
export class AuthModule {}
