import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService, LoginResult } from './auth.service';
import { LoginDto } from './dto/login.dto';

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
  login(@Body() dto: LoginDto): Promise<LoginResult> {
    return this.authService.login(dto);
  }
}
