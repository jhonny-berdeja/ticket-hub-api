import { ConflictException, Injectable } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { UsersRepository } from '../../common/database/user/users.repository';
import { RolesRepository } from '../../common/database/role/roles.repository';
import { Role } from '../../common/database/role/role.enum';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UserMapper } from './user.mapper';
import { UserWithRoles } from './user-with-roles';
import { AssignableUser } from './assignable-user';

/** Roles allowed to be picked as a ticket assignee — a DEV creating a ticket must hand it to someone who can approve it. */
const ASSIGNABLE_ROLES: Role[] = [Role.APPROVER, Role.ADMIN];

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

  /** Reachable by any authenticated user (a DEV picking an assignee is not ADMIN) — returns only APPROVER/ADMIN users, and only the fields needed to pick one, never roles/password. */
  async findAssignableApprovers(): Promise<ResponseBody<AssignableUser[]>> {
    const roleEntities =
      await this.rolesRepository.findByRoles(ASSIGNABLE_ROLES);
    const uniqueUserIds = [...new Set(roleEntities.map((role) => role.idUser))];
    const users = await this.usersRepository.findByIds(uniqueUserIds);

    const data: AssignableUser[] = users.map((user) => ({
      id: user.id,
      name: user.name,
      lastname: user.lastname,
      email: user.email,
    }));

    return ResponseBody.builder<AssignableUser[]>()
      .withMsg('Assignable users retrieved successfully')
      .withData(data)
      .build();
  }
}
