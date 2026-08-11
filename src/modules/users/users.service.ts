import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { UserEntity } from '../../common/database/user/user.entity';
import { UsersRepository } from '../../common/database/user/users.repository';
import { RolesRepository } from '../../common/database/role/roles.repository';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserMapper } from './user.mapper';
import { UserWithRoles } from './user-with-roles';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly rolesRepository: RolesRepository,
    private readonly authService: AuthService,
  ) {}

  async create(dto: CreateUserDto): Promise<ResponseBody<UserWithRoles>> {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await this.authService.hashPassword(dto.password);
    const userEntity = UserMapper.toEntity(dto, hashedPassword);
    const createdUser = await this.usersRepository.createUser(userEntity);
    const roleEntities = await this.rolesRepository.createRolesForUser(
      createdUser.id,
      dto.roles,
    );

    return ResponseBody.builder<UserWithRoles>()
      .withMsg('User created successfully')
      .withData(UserMapper.toResponse(createdUser, roleEntities))
      .build();
  }

  async findAll(): Promise<ResponseBody<UserWithRoles[]>> {
    const users = await this.usersRepository.findAll();
    const roles = await this.rolesRepository.findByUserIds(
      users.map((user) => user.id),
    );

    const data = users.map((user) =>
      UserMapper.toResponse(
        user,
        roles.filter((role) => role.idUser === user.id),
      ),
    );

    return ResponseBody.builder<UserWithRoles[]>()
      .withMsg('Users retrieved successfully')
      .withData(data)
      .build();
  }

  async update(
    id: number,
    dto: UpdateUserDto,
  ): Promise<ResponseBody<UserWithRoles>> {
    const existing = await this.findExistingUserOrThrow(id);
    await this.assertEmailNotTakenByAnotherUser(dto.email, existing.id);

    const updatedUser = await this.usersRepository.updateUser(id, {
      name: dto.name,
      lastname: dto.lastname,
      email: dto.email,
    });
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
