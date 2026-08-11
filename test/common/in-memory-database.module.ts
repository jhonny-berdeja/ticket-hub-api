import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../../src/common/database/user/user.entity';
import { UsersRepository } from '../../src/common/database/user/users.repository';
import { RoleEntity } from '../../src/common/database/role/role.entity';
import { RolesRepository } from '../../src/common/database/role/roles.repository';
import { TicketEntity } from '../../src/common/database/ticket/ticket.entity';
import { TicketsRepository } from '../../src/common/database/ticket/tickets.repository';

/**
 * Real, unmocked `TypeOrmModule` backed by a throwaway in-memory SQLite DB —
 * same shape as `common/database/database.module.ts`, just swapping the
 * Postgres connection for `better-sqlite3 :memory:` so e2e suites need no
 * running database. Shared by every module's e2e spec under `test/modules/`.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: ':memory:',
      entities: [UserEntity, RoleEntity, TicketEntity],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([UserEntity, RoleEntity, TicketEntity]),
  ],
  providers: [UsersRepository, RolesRepository, TicketsRepository],
  exports: [UsersRepository, RolesRepository, TicketsRepository, TypeOrmModule],
})
export class InMemoryDatabaseModule {}
