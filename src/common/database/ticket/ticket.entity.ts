import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { TicketStatus } from './ticket-status.enum';

@Entity({ name: 'tickets' })
export class TicketEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  number!: number;

  @Column({ type: 'int' })
  creator!: number;

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
    name: 'code_ansible',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  codeAnsible!: string | null;

  @Column({ type: 'text', nullable: true })
  response!: string | null;

  static builder(): TicketEntityBuilder {
    return new TicketEntityBuilder();
  }
}

export class TicketEntityBuilder {
  private number?: number;
  private creator?: number;
  private informer?: string;
  private assignee: string | null = null;
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
    if (this.informer === undefined) {
      throw new Error('TicketEntity.Builder: informer is required');
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
    entity.informer = this.informer;
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
