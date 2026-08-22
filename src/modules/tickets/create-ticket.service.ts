import { Injectable } from '@nestjs/common';
import { DatacenterTicketsRepository } from '../../common/database/ticket/datacenter-tickets.repository';
import { DatabaseTicketsRepository } from '../../common/database/ticket/database-tickets.repository';
import { KubernetesTicketsRepository } from '../../common/database/ticket/kubernetes-tickets.repository';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { CreateAnsibleTicketDto } from './dto/create-ansible-ticket.dto';
import { CreateDatabaseTicketDto } from './dto/create-database-ticket.dto';
import { CreateKubernetesTicketDto } from './dto/create-kubernetes-ticket.dto';
import { TicketMapper } from './ticket.mapper';
import { TicketResponse } from './ticket-response';

/**
 * `TicketsService.createAnsible`/`createDatabase`/`createKubernetes`
 * consolidated here: one method per ticket kind, each keeping its own
 * numbering/persistence flow scoped to its own repository/mapper pair.
 */
@Injectable()
export class CreateTicketService {
  constructor(
    private readonly datacenterTicketsRepository: DatacenterTicketsRepository,
    private readonly databaseTicketsRepository: DatabaseTicketsRepository,
    private readonly kubernetesTicketsRepository: KubernetesTicketsRepository,
  ) {}

  async createAnsible(
    dto: CreateAnsibleTicketDto,
    informer: string,
  ): Promise<ResponseBody<TicketResponse>> {
    const maxNumber = await this.datacenterTicketsRepository.findMaxNumber();
    const nextNumber = (maxNumber ?? 0) + 1;

    const ticketEntity = TicketMapper.toAnsibleEntity(
      dto,
      informer,
      nextNumber,
    );
    const createdTicket =
      await this.datacenterTicketsRepository.createTicket(ticketEntity);

    return ResponseBody.builder<TicketResponse>()
      .withMsg('Ticket created successfully')
      .withData(TicketMapper.toAnsibleResponse(createdTicket))
      .build();
  }

  async createDatabase(
    dto: CreateDatabaseTicketDto,
    informer: string,
  ): Promise<ResponseBody<TicketResponse>> {
    const maxNumber = await this.databaseTicketsRepository.findMaxNumber();
    const nextNumber = (maxNumber ?? 0) + 1;

    const ticketEntity = TicketMapper.toDatabaseEntity(
      dto,
      informer,
      nextNumber,
    );
    const createdTicket =
      await this.databaseTicketsRepository.createTicket(ticketEntity);

    return ResponseBody.builder<TicketResponse>()
      .withMsg('Ticket created successfully')
      .withData(TicketMapper.toDatabaseResponse(createdTicket))
      .build();
  }

  async createKubernetes(
    dto: CreateKubernetesTicketDto,
    informer: string,
  ): Promise<ResponseBody<TicketResponse>> {
    const maxNumber = await this.kubernetesTicketsRepository.findMaxNumber();
    const nextNumber = (maxNumber ?? 0) + 1;

    const ticketEntity = TicketMapper.toKubernetesEntity(
      dto,
      informer,
      nextNumber,
    );
    const createdTicket =
      await this.kubernetesTicketsRepository.createTicket(ticketEntity);

    return ResponseBody.builder<TicketResponse>()
      .withMsg('Ticket created successfully')
      .withData(TicketMapper.toKubernetesResponse(createdTicket))
      .build();
  }
}
