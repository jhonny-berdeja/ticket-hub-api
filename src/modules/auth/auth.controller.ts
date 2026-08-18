import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from './guards/current-user.decorator';
import type { AuthenticatedUser } from './authenticated-user';
import { ResponseBody } from '../../common/dto/response-body.dto';

@Controller('auth')
export class AuthController {
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser): ResponseBody<AuthenticatedUser> {
    return ResponseBody.builder<AuthenticatedUser>()
      .withMsg('Current user')
      .withData(user)
      .build();
  }
}
