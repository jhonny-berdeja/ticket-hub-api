import { ConflictException, Injectable } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { UsersRepository } from '../../common/database/user/users.repository';
import { RolesRepository } from '../../common/database/role/roles.repository';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { CreateUserDto } from './dto/create-user.dto';
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
}
