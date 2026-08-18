import { TicketEntity } from '../../common/database/ticket/ticket.entity';
import { TicketStatus } from '../../common/database/ticket/ticket-status.enum';
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
      .withCodeAnsible(dto.codeAnsible)
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
      codeAnsible: ticket.codeAnsible,
      response: ticket.response,
    };
  }
}
