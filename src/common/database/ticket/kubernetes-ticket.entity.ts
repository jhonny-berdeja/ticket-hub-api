import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { KubernetesExecutionType } from './kubernetes-execution-type.enum';
import { TicketStatus } from './ticket-status.enum';

/**
 * KUBERNETES-flavored tickets, mirroring `datacenter_tickets` exactly
 * except for `code_yaml` instead of `code_ansible` (see
 * `datacenter-ticket.entity.ts`). `creator`/`ticketType` never existed
 * here: this table alone is the KUBERNETES discriminator, and ownership
 * checks use `informer` (see `ListTicketsService`/
 * `FindTicketByNumberService`).
 */
@Entity({ name: 'kubernetes_tickets' })
export class KubernetesTicketEntity {
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

  @Column({
    name: 'code_yaml',
    type: 'varchar',
    length: 5000,
    nullable: true,
  })
  codeYaml!: string | null;

  @Column({ type: 'text', nullable: true })
  response!: string | null;

  /**
   * Which pcbox-api endpoint approval routes to (see
   * `PcboxApiService.sendToConnector`) — `MANIFEST` keeps hitting
   * `POST /kubernetes`, `ANSIBLE` hits the newer `POST /kubernetes/ansible`.
   * Not nullable: every ticket must declare its execution flavor at
   * creation time, no implicit default at the DB level.
   */
  @Column({ name: 'execution_type', type: 'varchar', length: 10 })
  executionType!: KubernetesExecutionType;

  static builder(): KubernetesTicketEntityBuilder {
    return new KubernetesTicketEntityBuilder();
  }
}

export class KubernetesTicketEntityBuilder {
  private number?: number;
  private informer?: string;
  private assignee: string | null = null;
  private department?: string;
  private subject?: string;
  private status?: TicketStatus;
  private description?: string;
  private codeYaml: string | null = null;
  private response: string | null = null;
  private executionType?: KubernetesExecutionType;

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

  withCodeYaml(codeYaml: string | null): this {
    this.codeYaml = codeYaml;
    return this;
  }

  withResponse(response: string | null): this {
    this.response = response;
    return this;
  }

  withExecutionType(executionType: KubernetesExecutionType): this {
    this.executionType = executionType;
    return this;
  }

  build(): KubernetesTicketEntity {
    if (this.number === undefined) {
      throw new Error('KubernetesTicketEntity.Builder: number is required');
    }
    if (this.informer === undefined) {
      throw new Error('KubernetesTicketEntity.Builder: informer is required');
    }
    if (this.department === undefined) {
      throw new Error('KubernetesTicketEntity.Builder: department is required');
    }
    if (this.subject === undefined) {
      throw new Error('KubernetesTicketEntity.Builder: subject is required');
    }
    if (this.status === undefined) {
      throw new Error('KubernetesTicketEntity.Builder: status is required');
    }
    if (this.description === undefined) {
      throw new Error(
        'KubernetesTicketEntity.Builder: description is required',
      );
    }
    if (this.executionType === undefined) {
      throw new Error(
        'KubernetesTicketEntity.Builder: executionType is required',
      );
    }

    const entity = new KubernetesTicketEntity();
    entity.number = this.number;
    entity.informer = this.informer;
    entity.assignee = this.assignee;
    entity.department = this.department;
    entity.subject = this.subject;
    entity.status = this.status;
    entity.description = this.description;
    entity.codeYaml = this.codeYaml;
    entity.response = this.response;
    entity.executionType = this.executionType;
    return entity;
  }
}
