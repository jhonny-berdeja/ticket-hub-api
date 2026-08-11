import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Role } from './role.enum';
import { RoleEntity } from './role.entity';

@Injectable()
export class RolesRepository {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly repository: Repository<RoleEntity>,
  ) {}

  findByUserId(idUser: number): Promise<RoleEntity[]> {
    return this.repository.find({ where: { idUser } });
  }

  findByUserIds(idUsers: number[]): Promise<RoleEntity[]> {
    if (idUsers.length === 0) {
      return Promise.resolve([]);
    }
    return this.repository.find({ where: { idUser: In(idUsers) } });
  }

  /** Bulk-inserts one row per role — used both on user creation and on edit's "add" side. */
  createRolesForUser(idUser: number, roles: Role[]): Promise<RoleEntity[]> {
    const entities = roles.map((rol) =>
      RoleEntity.builder().withIdUser(idUser).withRol(rol).build(),
    );
    return this.repository.save(entities);
  }

  /**
   * Replaces a user's full role set: delete-then-recreate rather than a
   * diff, since the row count is tiny (at most 3) and this avoids
   * needing a separate "remove roles" path with its own tests.
   */
  async replaceRolesForUser(
    idUser: number,
    roles: Role[],
  ): Promise<RoleEntity[]> {
    await this.repository.delete({ idUser });
    return this.createRolesForUser(idUser, roles);
  }
}
