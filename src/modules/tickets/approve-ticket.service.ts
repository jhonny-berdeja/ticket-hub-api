import { Injectable, NotFoundException } from '@nestjs/common';
import { TicketEntity } from '../../common/database/ticket/ticket.entity';
import { TicketsRepository } from '../../common/database/ticket/tickets.repository';
import { TicketStatus } from '../../common/database/ticket/ticket-status.enum';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { PcboxApiService } from '../pcbox-api/pcbox-api.service';
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
 *
 * Notifying pcbox-api is intentionally its own step, after the status
 * update, not before and not wrapped in the same transaction: approval
 * is a business decision that must stand on its own, independent of
 * whether the technical call to trigger the playbook succeeds
 * (confirmed product decision). `PcboxApiService.notifyApproval` never
 * throws — whatever it returns (a success summary or a failure
 * description) always gets persisted to `response`.
 */
@Injectable()
export class ApproveTicketService {
  constructor(
    private readonly ticketsRepository: TicketsRepository,
    private readonly pcboxApiService: PcboxApiService,
  ) {}

  async approve(id: number): Promise<ResponseBody<TicketResponse>> {
    await this.findExistingTicketOrThrow(id);

    const approvedTicket = await this.ticketsRepository.updateStatus(
      id,
      TicketStatus.APPROVED,
    );

    const response = await this.pcboxApiService.notifyApproval(approvedTicket);
    const finalTicket = await this.ticketsRepository.updateResponse(
      id,
      response,
    );

    return ResponseBody.builder<TicketResponse>()
      .withMsg('Ticket approved successfully')
      .withData(TicketMapper.toResponse(finalTicket))
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
