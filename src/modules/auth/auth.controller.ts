import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from './guards/current-user.decorator';
import type { AuthenticatedUser } from './authenticated-user';
import { ResponseBody } from '../../common/dto/response-body.dto';

/**
 * `POST /auth/login` used to live here -- removed. ticket-hub
 * authenticates against auth-api's `POST /internal-users/login` now
 * (`X-Application-Name: ticket-hub`), not this app; `JwtAuthGuard`
 * verifies the resulting token via auth-api's JWKS (see
 * `guards/jwt-auth.guard.ts`), so a locally-signed token was already
 * dead weight before this cleanup.
 */
@Controller('auth')
export class AuthController {
  /**
   * Authenticated by the global JwtAuthGuard like every other non-public
   * route — no @Roles() here, so the global RolesGuard no-ops and any
   * authenticated user can read their own identity/roles. The frontend
   * uses this only to decide whether to show ADMIN-only UI (the
   * "Aprobar" button on a ticket's detail page, see
   * ticket-hub's TicketDetail.tsx), never as the actual authorization
   * check — that always happens again, independently, on the guarded
   * PATCH /tickets/:id/approve regardless of what a client does with
   * this response.
   */
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser): ResponseBody<AuthenticatedUser> {
    return ResponseBody.builder<AuthenticatedUser>()
      .withMsg('Current user')
      .withData(user)
      .build();
  }
}
