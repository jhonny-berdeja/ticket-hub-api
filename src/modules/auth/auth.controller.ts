import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ResponseLogin } from './dto/response-login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './guards/current-user.decorator';
import { PayloadJwt } from './payload-jwt';
import { ResponseBody } from '../../common/dto/response-body.dto';

/**
 * Stateless JSON endpoint — no cookies are set here. Cookie ownership lives
 * entirely in the Next.js Route Handler (Phase 4); this endpoint only
 * verifies credentials and returns the signed JWT in the response body.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<ResponseLogin> {
    return this.authService.login(dto);
  }

  /**
   * Any authenticated user can read their own identity/roles — no
   * `RolesGuard` here on purpose. The frontend uses this only to decide
   * whether to show ADMIN-only UI (the ABMC Usuarios button/page), never
   * as the actual authorization check — that always happens again,
   * independently, on the guarded /users endpoints regardless of what a
   * client does with this response.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: PayloadJwt): ResponseBody<PayloadJwt> {
    return ResponseBody.builder<PayloadJwt>()
      .withMsg('Current user')
      .withData(user)
      .build();
  }
}
