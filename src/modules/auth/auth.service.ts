import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

/** ~60-char bcrypt output; well within the `password` column's VARCHAR(100). */
const BCRYPT_SALT_ROUNDS = 10;

/**
 * Down to just `hashPassword` now that `login` is gone (ticket-hub
 * authenticates against auth-api instead, verified via JWKS -- see
 * `guards/jwt-auth.guard.ts`) -- kept as its own service, not folded
 * into `UsersService`, since `UsersModule` already depends on it this
 * way and splitting hashing out avoids a circular import if `AuthModule`
 * ever needs `UsersModule` again for something else.
 */
@Injectable()
export class AuthService {
  /** Used by `UsersService` when provisioning a new account. */
  hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  }
}
