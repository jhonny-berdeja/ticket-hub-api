import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Role } from '../../../common/database/role/role.enum';

/**
 * Field limits mirror the immutable `users` table column widths exactly
 * (`name`/`lastname` VARCHAR(15), `email` VARCHAR(30)) so oversized input
 * is rejected by validation before any database write is attempted.
 *
 * `roles` is mandatory with at least one entry — a user can hold several
 * roles at once (the `roles` table is one row per assignment, not a
 * single column), but never zero.
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

  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(Role, { each: true })
  roles: Role[];
}
