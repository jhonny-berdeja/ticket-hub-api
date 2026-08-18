import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ResponseLogin } from './dto/response-login.dto';
import { CurrentUser } from './guards/current-user.decorator';
import { Public } from './guards/public.decorator';
import type { AuthenticatedUser } from './authenticated-user';
import { ResponseBody } from '../../common/dto/response-body.dto';

/**
 * Stateless JSON endpoint — no cookies are set here. Cookie ownership lives
 * entirely in the Next.js Route Handler (Phase 4); this endpoint only
 * verifies credentials and returns the signed JWT in the response body.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Dead code pending removal: it still signs a valid-looking token, but
   * `JwtAuthGuard` now verifies exclusively against auth-api's JWKS
   * (RS256), so nothing this route issues passes that check anymore.
   * Left in place only until the identity migration to auth-api
   * (`internal-users` + `X-Application-Name: ticket-hub`) is complete —
   * removing this and `AuthService.login`/`UsersModule`'s password bits
   * together, in that step, rather than half-deleting them here.
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<ResponseLogin> {
    return this.authService.login(dto);
  }

  /**
   * Authenticated by the global JwtAuthGuard like every other non-public
   * route — no @Roles() here, so the global RolesGuard no-ops and any
   * authenticated user can read their own identity/roles. The frontend
   * uses this only to decide whether to show ADMIN-only UI (the ABMC
   * Usuarios button/page), never as the actual authorization check —
   * that always happens again, independently, on the guarded /users
   * endpoints regardless of what a client does with this response.
   */
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser): ResponseBody<AuthenticatedUser> {
    return ResponseBody.builder<AuthenticatedUser>()
      .withMsg('Current user')
      .withData(user)
      .build();
  }
}
