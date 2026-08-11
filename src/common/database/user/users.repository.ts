import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './user.entity';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
  ) {}

  findByEmail(email: string): Promise<UserEntity | null> {
    return this.repository.findOne({ where: { email } });
  }

  findById(id: number): Promise<UserEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  findAll(): Promise<UserEntity[]> {
    return this.repository.find();
  }

  createUser(user: UserEntity): Promise<UserEntity> {
    const entity = this.repository.create(user);
    return this.repository.save(entity);
  }

  /** `id` and `password` are never touched here — updating those goes through dedicated flows, not this one. */
  async updateUser(
    id: number,
    fields: Pick<UserEntity, 'name' | 'lastname' | 'email'>,
  ): Promise<UserEntity> {
    await this.repository.update(id, fields);
    // `findById` right after `update` (rather than trusting the merged
    // input) so the returned entity always reflects exactly what the DB
    // now holds, not what the caller assumed it sent.
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(
        `updateUser: user ${id} vanished immediately after update`,
      );
    }
    return updated;
  }
}
