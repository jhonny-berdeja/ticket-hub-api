import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { TicketStatus } from './ticket-status.enum';

/**
 * Maps the existing `tickets` table only (immutable baseline, same rule
 * as `UserEntity`/`RoleEntity`). `creator`/`assignee` stay plain integer
 * columns, not ORM relations — same reasoning as `RoleEntity.idUser`:
 * looked up explicitly by the repository, no relation object crossing
 * module boundaries.
 *
 * `number` is application-computed (TicketsRepository.findMaxNumber +
 * 1, see TicketsService.create), not DB-generated: a `@Generated`
 * secondary column relies on AUTOINCREMENT in SQLite, which SQLite only
 * allows on an INTEGER PRIMARY KEY - it cannot coexist with `id`
 * already holding that role, so it can't work identically against both
 * the real Postgres column and the e2e in-memory SQLite DB. The app
 * prefixes it with `TK-` only at the response boundary (see
 * TicketMapper.toResponse), never stored with the prefix.
 */
@Entity({ name: 'tickets' })
export class TicketEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  number!: number;

  @Column({ type: 'int' })
  creator!: number;

  @Column({ type: 'int', nullable: true })
  assignee!: number | null;

  @Column({ length: 25 })
  department!: string;

  @Column({ length: 100 })
  subject!: string;

  @Column({ type: 'varchar', length: 20 })
  status!: TicketStatus;

  @Column({ length: 200 })
  description!: string;

  // `type: 'varchar'` explicit for the same reason as RoleEntity.rol:
  // TypeORM infers a nullable string column as generic `Object` from TS
  // reflection when omitted, which `better-sqlite3` (the e2e in-memory
  // DB) rejects outright.
  @Column({
    name: 'code_ansible',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  codeAnsible!: string | null;

  /**
   * pcbox-api's full answer to the `POST /pcbox` call
   * `ApproveTicketService` makes right after approval — `msg` + the
   * execution outcome + the complete stdout/stderr, or a failure
   * description if that call didn't go through. `text`, not a bounded
   * `varchar`: a playbook's stdout has no predictable upper bound.
   * `null` until a ticket is actually approved — same
   * "business-mandatory, DB-nullable" reasoning as `codeAnsible`
   * becoming mandatory at the DTO level without a NOT NULL here (see
   * CreateTicketDto's own comment): adding NOT NULL later would need a
   * migration for every row that predates this column, this way it
   * doesn't.
   */
  @Column({ type: 'text', nullable: true })
  response!: string | null;

  static builder(): TicketEntityBuilder {
    return new TicketEntityBuilder();
  }
}

/** Fluent builder for `TicketEntity` — mirrors `UserEntityBuilder`'s pattern. `id` is DB-generated, never settable here; `number` IS settable — it's computed by the caller (TicketsService.create), not the DB. */
export class TicketEntityBuilder {
  private number?: number;
  private creator?: number;
  private assignee: number | null = null;
  private department?: string;
  private subject?: string;
  private status?: TicketStatus;
  private description?: string;
  private codeAnsible: string | null = null;
  private response: string | null = null;

  withNumber(number: number): this {
    this.number = number;
    return this;
  }

  withCreator(creator: number): this {
    this.creator = creator;
    return this;
  }

  withAssignee(assignee: number | null): this {
    this.assignee = assignee;
    return this;
  }

  withDepartment(department: string): this {
    this.department = department;
    return this;
  }

  withSubject(subject: string): this {
    this.subject = subject;
    return this;
  }

  withStatus(status: TicketStatus): this {
    this.status = status;
    return this;
  }

  withDescription(description: string): this {
    this.description = description;
    return this;
  }

  withCodeAnsible(codeAnsible: string | null): this {
    this.codeAnsible = codeAnsible;
    return this;
  }

  withResponse(response: string | null): this {
    this.response = response;
    return this;
  }

  build(): TicketEntity {
    if (this.number === undefined) {
      throw new Error('TicketEntity.Builder: number is required');
    }
    if (this.creator === undefined) {
      throw new Error('TicketEntity.Builder: creator is required');
    }
    if (this.department === undefined) {
      throw new Error('TicketEntity.Builder: department is required');
    }
    if (this.subject === undefined) {
      throw new Error('TicketEntity.Builder: subject is required');
    }
    if (this.status === undefined) {
      throw new Error('TicketEntity.Builder: status is required');
    }
    if (this.description === undefined) {
      throw new Error('TicketEntity.Builder: description is required');
    }

    const entity = new TicketEntity();
    entity.number = this.number;
    entity.creator = this.creator;
    entity.assignee = this.assignee;
    entity.department = this.department;
    entity.subject = this.subject;
    entity.status = this.status;
    entity.description = this.description;
    entity.codeAnsible = this.codeAnsible;
    entity.response = this.response;
    return entity;
  }
}
