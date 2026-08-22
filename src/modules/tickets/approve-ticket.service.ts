import { Injectable, NotFoundException } from '@nestjs/common';
import { DatacenterTicketsRepository } from '../../common/database/ticket/datacenter-tickets.repository';
import { DatabaseTicketsRepository } from '../../common/database/ticket/database-tickets.repository';
import { KubernetesTicketsRepository } from '../../common/database/ticket/kubernetes-tickets.repository';
import { TicketStatus } from '../../common/database/ticket/ticket-status.enum';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { PcboxApiService } from '../pcbox-api/pcbox-api.service';
import { TicketMapper } from './ticket.mapper';
import { TicketResponse } from './ticket-response';

const TICKET_NOT_FOUND_MESSAGE = 'Ticket not found';

/**
 * `id` alone doesn't say which table a ticket lives in (each table has its
 * own primary key sequence) — the caller now states which table via the
 * route, so each public method queries only its own table. No probing/
 * fallback across tables happens here anymore (see the by-number split in
 * `FindTicketByNumberService` for the same pattern).
 */
@Injectable()
export class ApproveTicketService {
  constructor(
    private readonly datacenterTicketsRepository: DatacenterTicketsRepository,
    private readonly databaseTicketsRepository: DatabaseTicketsRepository,
    private readonly kubernetesTicketsRepository: KubernetesTicketsRepository,
    private readonly pcboxApiService: PcboxApiService,
  ) {}

  async approveAnsible(id: number): Promise<ResponseBody<TicketResponse>> {
    const ticket = await this.datacenterTicketsRepository.findById(id);
    if (!ticket) {
      throw new NotFoundException(TICKET_NOT_FOUND_MESSAGE);
    }

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

  async approveDatabase(id: number): Promise<ResponseBody<TicketResponse>> {
    const ticket = await this.databaseTicketsRepository.findById(id);
    if (!ticket) {
      throw new NotFoundException(TICKET_NOT_FOUND_MESSAGE);
    }

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

  async approveKubernetes(id: number): Promise<ResponseBody<TicketResponse>> {
    const ticket = await this.kubernetesTicketsRepository.findById(id);
    if (!ticket) {
      throw new NotFoundException(TICKET_NOT_FOUND_MESSAGE);
    }

    const approvedTicket =
      await this.kubernetesTicketsRepository.updateStatus(
        id,
        TicketStatus.APPROVED,
      );
    const response = await this.pcboxApiService.notifyApproval(
      approvedTicket,
    );
    const finalTicket = await this.kubernetesTicketsRepository.updateResponse(
      id,
      response,
    );

    return ResponseBody.builder<TicketResponse>()
      .withMsg('Ticket approved successfully')
      .withData(TicketMapper.toKubernetesResponse(finalTicket))
      .build();
  }
}
