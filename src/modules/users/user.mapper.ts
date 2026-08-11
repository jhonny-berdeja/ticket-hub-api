import { UserEntity } from '../../common/database/user/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

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
}
