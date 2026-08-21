import { Injectable, NotFoundException } from '@nestjs/common';
import { DatacenterTicketsRepository } from '../../common/database/ticket/datacenter-tickets.repository';
import { DatabaseTicketsRepository } from '../../common/database/ticket/database-tickets.repository';
import { TicketStatus } from '../../common/database/ticket/ticket-status.enum';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { PcboxApiService } from '../pcbox-api/pcbox-api.service';
import { TicketMapper } from './ticket.mapper';
import { TicketResponse } from './ticket-response';

const TICKET_NOT_FOUND_MESSAGE = 'Ticket not found';

@Injectable()
export class ApproveTicketService {
  constructor(
    private readonly datacenterTicketsRepository: DatacenterTicketsRepository,
    private readonly databaseTicketsRepository: DatabaseTicketsRepository,
    private readonly pcboxApiService: PcboxApiService,
  ) {}

  /**
   * `id` alone doesn't say which table a ticket lives in (each table has
   * its own primary key sequence) — probe `datacenter_tickets` first,
   * then `database_tickets`, and approve on whichever one has it.
   */
  async approve(id: number): Promise<ResponseBody<TicketResponse>> {
    const datacenterTicket =
      await this.datacenterTicketsRepository.findById(id);
    if (datacenterTicket) {
      return this.approveDatacenterTicket(id);
    }

    const databaseTicket = await this.databaseTicketsRepository.findById(id);
    if (databaseTicket) {
      return this.approveDatabaseTicket(id);
    }

    throw new NotFoundException(TICKET_NOT_FOUND_MESSAGE);
  }

  private async approveDatacenterTicket(
    id: number,
  ): Promise<ResponseBody<TicketResponse>> {
    const approvedTicket = await this.datacenterTicketsRepository.updateStatus(
      id,
      TicketStatus.APPROVED,
    );
    const response = await this.pcboxApiService.notifyApproval(
      approvedTicket,
    );
    const finalTicket = await this.datacenterTicketsRepository.updateResponse(
      id,
      response,
    );

    return ResponseBody.builder<TicketResponse>()
      .withMsg('Ticket approved successfully')
      .withData(TicketMapper.toAnsibleResponse(finalTicket))
      .build();
  }

  private async approveDatabaseTicket(
    id: number,
  ): Promise<ResponseBody<TicketResponse>> {
    const approvedTicket = await this.databaseTicketsRepository.updateStatus(
      id,
      TicketStatus.APPROVED,
    );
    const response = await this.pcboxApiService.notifyApproval(
      approvedTicket,
    );
    const finalTicket = await this.databaseTicketsRepository.updateResponse(
      id,
      response,
    );

    return ResponseBody.builder<TicketResponse>()
      .withMsg('Ticket approved successfully')
      .withData(TicketMapper.toDatabaseResponse(finalTicket))
      .build();
  }
}
