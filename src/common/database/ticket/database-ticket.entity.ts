import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { TicketStatus } from './ticket-status.enum';

/**
 * DATABASE-flavored tickets, split out of the old shared `tickets` table
 * (see `ticket-hub-db.md` for the migration). `creator`/`ticketType` are
 * gone. `db_namespace`/`db_deployment` stay, though: pcbox-api's
 * `DbTargetValidator.assertAllowed`/`SqlPlaybookBuilder.build` genuinely
 * need namespace/deployment/dbName as caller-supplied input at approval
 * time, which can happen long after creation — this table is the only
 * place that can carry them across that gap. Ownership checks use
 * `informer` instead of the old `creator` (see `ListTicketsService`/
 * `FindTicketByNumberService`).
 */
@Entity({ name: 'database_tickets' })
export class DatabaseTicketEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  number!: number;

  @Column({ length: 30 })
  informer!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  assignee!: string | null;

  @Column({ length: 25 })
  department!: string;

  @Column({ length: 100 })
  subject!: string;

  @Column({ type: 'varchar', length: 20 })
  status!: TicketStatus;

  @Column({ length: 200 })
  description!: string;

  @Column({ type: 'text', nullable: true })
  response!: string | null;

  @Column({ name: 'db_namespace', type: 'varchar', length: 63, nullable: true })
  dbNamespace!: string | null;

  @Column({
    name: 'db_deployment',
    type: 'varchar',
    length: 63,
    nullable: true,
  })
  dbDeployment!: string | null;

  @Column({ name: 'db_name', type: 'varchar', length: 63, nullable: true })
  dbName!: string | null;

  @Column({ name: 'sql_code', type: 'varchar', length: 5000, nullable: true })
  sqlCode!: string | null;

  static builder(): DatabaseTicketEntityBuilder {
    return new DatabaseTicketEntityBuilder();
  }
}

export class DatabaseTicketEntityBuilder {
  private number?: number;
  private informer?: string;
  private assignee: string | null = null;
  private department?: string;
  private subject?: string;
  private status?: TicketStatus;
  private description?: string;
  private response: string | null = null;
  private dbNamespace: string | null = null;
  private dbDeployment: string | null = null;
  private dbName: string | null = null;
  private sqlCode: string | null = null;

  withNumber(number: number): this {
    this.number = number;
    return this;
  }

  withInformer(informer: string): this {
    this.informer = informer;
    return this;
  }

  withAssignee(assignee: string | null): this {
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

  withResponse(response: string | null): this {
    this.response = response;
    return this;
  }

  withDbNamespace(dbNamespace: string | null): this {
    this.dbNamespace = dbNamespace;
    return this;
  }

  withDbDeployment(dbDeployment: string | null): this {
    this.dbDeployment = dbDeployment;
    return this;
  }

  withDbName(dbName: string | null): this {
    this.dbName = dbName;
    return this;
  }

  withSqlCode(sqlCode: string | null): this {
    this.sqlCode = sqlCode;
    return this;
  }

  build(): DatabaseTicketEntity {
    if (this.number === undefined) {
      throw new Error('DatabaseTicketEntity.Builder: number is required');
    }
    if (this.informer === undefined) {
      throw new Error('DatabaseTicketEntity.Builder: informer is required');
    }
    if (this.department === undefined) {
      throw new Error('DatabaseTicketEntity.Builder: department is required');
    }
    if (this.subject === undefined) {
      throw new Error('DatabaseTicketEntity.Builder: subject is required');
    }
    if (this.status === undefined) {
      throw new Error('DatabaseTicketEntity.Builder: status is required');
    }
    if (this.description === undefined) {
      throw new Error(
        'DatabaseTicketEntity.Builder: description is required',
      );
    }

    const entity = new DatabaseTicketEntity();
    entity.number = this.number;
    entity.informer = this.informer;
    entity.assignee = this.assignee;
    entity.department = this.department;
    entity.subject = this.subject;
    entity.status = this.status;
    entity.description = this.description;
    entity.response = this.response;
    entity.dbNamespace = this.dbNamespace;
    entity.dbDeployment = this.dbDeployment;
    entity.dbName = this.dbName;
    entity.sqlCode = this.sqlCode;
    return entity;
  }
}
