import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsString,
  MaxLength,
} from 'class-validator';
import { Role } from '../../../common/database/role/role.enum';

/**
 * Editing covers name/lastname/email/roles only — password reset is a
 * separate flow, not part of this DTO (confirmed product decision).
 * All fields are required (full-replace semantics, not a partial PATCH)
 * so the edit form always submits the complete picture and there is no
 * ambiguity about which fields were left untouched on purpose.
 */
export class UpdateUserDto {
  @IsString()
  @MaxLength(15)
  name: string;

  @IsString()
  @MaxLength(15)
  lastname: string;

  @IsEmail()
  @MaxLength(30)
  email: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(Role, { each: true })
  roles: Role[];
}
