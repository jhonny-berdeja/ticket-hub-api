import { TicketEntity } from '../../common/database/ticket/ticket.entity';
import { TicketStatus } from '../../common/database/ticket/ticket-status.enum';
import { TicketType } from '../../common/database/ticket/ticket-type.enum';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { TicketResponse } from './ticket-response';

const NUMBER_DISPLAY_PREFIX = 'TK-';

export class TicketMapper {
  static toEntity(
    dto: CreateTicketDto,
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
      .withTicketType(dto.ticketType ?? TicketType.ANSIBLE)
      .withCodeAnsible(dto.codeAnsible ?? null)
      .withDbNamespace(dto.namespace ?? null)
      .withDbDeployment(dto.deployment ?? null)
      .withDbName(dto.dbName ?? null)
      .withOperationType(dto.operationType ?? null)
      .withSqlCode(dto.sqlCode ?? null)
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
      operationType: ticket.operationType,
      sqlCode: ticket.sqlCode,
    };
  }
}
