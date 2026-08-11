import { IsEmail, IsString, MinLength } from 'class-validator';

/**
 * Login only needs presence/shape validation — the actual credential check
 * (existence + password match) happens in `AuthService` against the stored
 * hash, not here. No `@MaxLength` mirroring is required since this DTO is
 * never persisted.
 */
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  password: string;
}
