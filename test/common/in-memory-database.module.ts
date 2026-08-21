import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatacenterTicketEntity } from '../../src/common/database/ticket/datacenter-ticket.entity';
import { DatabaseTicketEntity } from '../../src/common/database/ticket/database-ticket.entity';
import { DatacenterTicketsRepository } from '../../src/common/database/ticket/datacenter-tickets.repository';
import { DatabaseTicketsRepository } from '../../src/common/database/ticket/database-tickets.repository';

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
      entities: [DatacenterTicketEntity, DatabaseTicketEntity],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([DatacenterTicketEntity, DatabaseTicketEntity]),
  ],
  providers: [DatacenterTicketsRepository, DatabaseTicketsRepository],
  exports: [
    DatacenterTicketsRepository,
    DatabaseTicketsRepository,
    TypeOrmModule,
  ],
})
export class InMemoryDatabaseModule {}
