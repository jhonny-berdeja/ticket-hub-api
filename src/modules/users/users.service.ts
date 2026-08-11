import { ConflictException, Injectable } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { UserEntity } from '../../common/database/user/user.entity';
import { UsersRepository } from '../../common/database/user/users.repository';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UserMapper } from './user.mapper';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly authService: AuthService,
  ) {}

  async create(
    dto: CreateUserDto,
  ): Promise<ResponseBody<Omit<UserEntity, 'password'>>> {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await this.authService.hashPassword(dto.password);

    const userEntity = UserMapper.toEntity(dto, hashedPassword);

    const createdUser = await this.usersRepository.createUser(userEntity);

    const { password, ...publicUser } = createdUser;

    return ResponseBody.builder<Omit<UserEntity, 'password'>>()
      .withMsg('User created successfully')
      .withData(publicUser)
      .build();
  }
}
