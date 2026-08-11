import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserEntity } from '../../common/database/user/user.entity';
import { UsersRepository } from '../../common/database/user/users.repository';
import { RolesRepository } from '../../common/database/role/roles.repository';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserMapper } from './user.mapper';
import { UserWithRoles } from './user-with-roles';

/**
 * Split out of `UsersService`: `update` leans on its own private helpers
 * (`findExistingUserOrThrow`, `assertEmailNotTakenByAnotherUser`), so per
 * the module-service convention it gets a dedicated file instead of
 * living alongside the self-contained handlers in `users.service.ts`.
 */
@Injectable()
export class UpdateUserService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly rolesRepository: RolesRepository,
  ) {}

  async update(
    id: number,
    dto: UpdateUserDto,
  ): Promise<ResponseBody<UserWithRoles>> {
    const existing = await this.findExistingUserOrThrow(id);
    await this.assertEmailNotTakenByAnotherUser(dto.email, existing.id);

    const updatedUser = await this.usersRepository.updateUser(
      id,
      UserMapper.toUpdateFields(dto),
    );
    const roleEntities = await this.rolesRepository.replaceRolesForUser(
      id,
      dto.roles,
    );

    return ResponseBody.builder<UserWithRoles>()
      .withMsg('User updated successfully')
      .withData(UserMapper.toResponse(updatedUser, roleEntities))
      .build();
  }

  private async findExistingUserOrThrow(id: number): Promise<UserEntity> {
    const existing = await this.usersRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return existing;
  }

  private async assertEmailNotTakenByAnotherUser(
    email: string,
    currentUserId: number,
  ): Promise<void> {
    const owner = await this.usersRepository.findByEmail(email);
    if (owner && owner.id !== currentUserId) {
      throw new ConflictException('Email already in use');
    }
  }
}
