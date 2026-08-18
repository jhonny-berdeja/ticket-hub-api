import { Injectable, NotFoundException } from '@nestjs/common';
import { TicketEntity } from '../../common/database/ticket/ticket.entity';
import { TicketsRepository } from '../../common/database/ticket/tickets.repository';
import { TicketStatus } from '../../common/database/ticket/ticket-status.enum';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { PcboxApiService } from '../pcbox-api/pcbox-api.service';
import { TicketMapper } from './ticket.mapper';
import { TicketResponse } from './ticket-response';

const TICKET_NOT_FOUND_MESSAGE = 'Ticket not found';

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
