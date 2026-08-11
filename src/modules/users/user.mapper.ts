import { UserEntity } from '../../common/database/user/user.entity';
import { RoleEntity } from '../../common/database/role/role.entity';
import { Role } from '../../common/database/role/role.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserWithRoles } from './user-with-roles';

export class UserMapper {
  /** Maps the incoming DTO plus its already-hashed password to a persistable entity. */
  static toEntity(dto: CreateUserDto, hashedPassword: string): UserEntity {
    return UserEntity.builder()
      .withName(dto.name)
      .withLastname(dto.lastname)
      .withEmail(dto.email)
      .withPassword(hashedPassword)
      .build();
  }

  /** Maps the DTO's editable fields for a full-replace update — password and roles go through their own flows, not this one. */
  static toUpdateFields(
    dto: UpdateUserDto,
  ): Pick<UserEntity, 'name' | 'lastname' | 'email'> {
    return {
      name: dto.name,
      lastname: dto.lastname,
      email: dto.email,
    };
  }

  /** Combines a persisted user with its role rows into the public response shape — password never included. */
  static toResponse(user: UserEntity, roles: RoleEntity[]): UserWithRoles {
    return {
      id: user.id,
      name: user.name,
      lastname: user.lastname,
      email: user.email,
      roles: roles.map((role): Role => role.rol),
    };
  }
}
