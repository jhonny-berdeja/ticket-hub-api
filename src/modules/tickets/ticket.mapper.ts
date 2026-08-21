import { TicketEntity } from '../../common/database/ticket/ticket.entity';
import { TicketStatus } from '../../common/database/ticket/ticket-status.enum';
import { TicketType } from '../../common/database/ticket/ticket-type.enum';
import { CreateAnsibleTicketDto } from './dto/create-ansible-ticket.dto';
import { CreateDatabaseTicketDto } from './dto/create-database-ticket.dto';
import { TicketResponse } from './ticket-response';

const NUMBER_DISPLAY_PREFIX = 'TK-';

export class TicketMapper {
  /** `POST /tickets/ansible` — the only write allowed to set ANSIBLE fields. */
  static toAnsibleEntity(
    dto: CreateAnsibleTicketDto,
    creator: number,
    informer: string,
    number: number,
  ): TicketEntity {
    return TicketEntity.builder()
      .withNumber(number)
      .withCreator(creator)
      .withInformer(informer)
      .withAssignee(dto.assignee)
      .withDepartment(dto.department)
      .withSubject(dto.subject)
      .withStatus(TicketStatus.CREATED)
      .withDescription(dto.description)
      .withTicketType(TicketType.ANSIBLE)
      .withCodeAnsible(dto.codeAnsible ?? null)
      .build();
  }

  /** `POST /tickets/database` — the only write allowed to set DATABASE fields. */
  static toDatabaseEntity(
    dto: CreateDatabaseTicketDto,
    creator: number,
    informer: string,
    number: number,
  ): TicketEntity {
    return TicketEntity.builder()
      .withNumber(number)
      .withCreator(creator)
      .withInformer(informer)
      .withAssignee(dto.assignee)
      .withDepartment(dto.department)
      .withSubject(dto.subject)
      .withStatus(TicketStatus.CREATED)
      .withDescription(dto.description)
      .withTicketType(TicketType.DATABASE)
      .withDbNamespace(dto.namespace)
      .withDbDeployment(dto.deployment)
      .withDbName(dto.dbName)
      .withSqlCode(dto.sqlCode)
      .build();
  }

  static toResponse(ticket: TicketEntity): TicketResponse {
    return {
      id: ticket.id,
      number: `${NUMBER_DISPLAY_PREFIX}${ticket.number}`,
      creator: ticket.creator,
      informer: ticket.informer,
      assignee: ticket.assignee,
      department: ticket.department,
      subject: ticket.subject,
      status: ticket.status,
      description: ticket.description,
      ticketType: ticket.ticketType,
      codeAnsible: ticket.codeAnsible,
      response: ticket.response,
      namespace: ticket.dbNamespace,
      deployment: ticket.dbDeployment,
      dbName: ticket.dbName,
      sqlCode: ticket.sqlCode,
    };
  }
}
