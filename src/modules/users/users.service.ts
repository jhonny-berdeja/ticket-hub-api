import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from '../../shared/database/repositories/users.repository';
import { CreateUserDto } from './dto/create-user.dto';

/** ~60-char bcrypt output; well within the `password` column's VARCHAR(100). */
const BCRYPT_SALT_ROUNDS = 10;

export interface PublicUser {
  id: number;
  name: string;
  lastname: string;
  email: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(dto: CreateUserDto): Promise<PublicUser> {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    const user = await this.usersRepository.createUser({
      name: dto.name,
      lastname: dto.lastname,
      email: dto.email,
      password: hashedPassword,
    });

    return {
      id: user.id,
      name: user.name,
      lastname: user.lastname,
      email: user.email,
    };
  }
}
