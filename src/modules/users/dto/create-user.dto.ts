import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Field limits mirror the immutable `users` table column widths exactly
 * (`name`/`lastname` VARCHAR(15), `email` VARCHAR(30)) so oversized input
 * is rejected by validation before any database write is attempted.
 */
export class CreateUserDto {
  @IsString()
  @MaxLength(15)
  name: string;

  @IsString()
  @MaxLength(15)
  lastname: string;

  @IsEmail()
  @MaxLength(30)
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}
