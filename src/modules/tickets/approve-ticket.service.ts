import { Injectable, NotFoundException } from '@nestjs/common';
import { TicketEntity } from '../../common/database/ticket/ticket.entity';
import { TicketsRepository } from '../../common/database/ticket/tickets.repository';
import { TicketStatus } from '../../common/database/ticket/ticket-status.enum';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { TicketMapper } from './ticket.mapper';
import { TicketResponse } from './ticket-response';

const TICKET_NOT_FOUND_MESSAGE = 'Ticket not found';

/**
 * Split out of `TicketsService`: `approve` leans on its own private
 * helper (`findExistingTicketOrThrow`), so per the module-service
 * convention it gets a dedicated file instead of living alongside the
 * self-contained handlers in `tickets.service.ts`. Mirrors
 * `UpdateUserService`.
 *
 * No role check in here: `@Roles(Role.APPROVER, Role.ADMIN)` on the
 * controller already restricts who can reach this at all, and either
 * role may approve *any* ticket - no ownership/assignee check, unlike
 * `findByNumber`'s DEV-only-own-tickets restriction.
 */
@Injectable()
export class ApproveTicketService {
  constructor(private readonly ticketsRepository: TicketsRepository) {}

  async approve(id: number): Promise<ResponseBody<TicketResponse>> {
    await this.findExistingTicketOrThrow(id);

    const approvedTicket = await this.ticketsRepository.updateStatus(
      id,
      TicketStatus.APPROVED,
    );

    return ResponseBody.builder<TicketResponse>()
      .withMsg('Ticket approved successfully')
      .withData(TicketMapper.toResponse(approvedTicket))
      .build();
  }

  private async findExistingTicketOrThrow(id: number): Promise<TicketEntity> {
    const existing = await this.ticketsRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(TICKET_NOT_FOUND_MESSAGE);
    }
    return existing;
  }
}
