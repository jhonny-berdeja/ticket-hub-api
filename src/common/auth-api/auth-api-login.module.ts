import { Module } from '@nestjs/common';
import { AuthApiLoginService } from './auth-api-login.service';

/**
 * Wraps the shared `AuthApiLoginService` so both `PcboxApiModule` and
 * `IamApiModule` can import it without either depending on the other.
 */
@Module({
  providers: [AuthApiLoginService],
  exports: [AuthApiLoginService],
})
export class AuthApiLoginModule {}
