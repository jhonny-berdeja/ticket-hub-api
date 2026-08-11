import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email } });
  }

  createUser(
    user: Pick<User, 'name' | 'lastname' | 'email' | 'password'>,
  ): Promise<User> {
    const entity = this.repository.create(user);
    return this.repository.save(entity);
  }
}
