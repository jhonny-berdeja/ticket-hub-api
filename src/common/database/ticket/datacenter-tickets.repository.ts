import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DatacenterTicketEntity } from './datacenter-ticket.entity';
import { TicketStatus } from './ticket-status.enum';

@Injectable()
export class DatacenterTicketsRepository {
  constructor(
    @InjectRepository(DatacenterTicketEntity)
    private readonly repository: Repository<DatacenterTicketEntity>,
  ) {}

  createTicket(
    ticket: DatacenterTicketEntity,
  ): Promise<DatacenterTicketEntity> {
    const entity = this.repository.create(ticket);
    return this.repository.save(entity);
  }

  /** Own `MAX(number) + 1` sequence, independent of `database_tickets`. */
  async findMaxNumber(): Promise<number | null> {
    return this.repository.maximum('number');
  }

  findById(id: number): Promise<DatacenterTicketEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  findByNumber(number: number): Promise<DatacenterTicketEntity | null> {
    return this.repository.findOne({ where: { number } });
  }

  findByInformer(informer: string): Promise<DatacenterTicketEntity[]> {
    return this.repository.find({ where: { informer } });
  }

  findAll(): Promise<DatacenterTicketEntity[]> {
    return this.repository.find();
  }

  async updateStatus(
    id: number,
    status: TicketStatus,
  ): Promise<DatacenterTicketEntity> {
    await this.repository.update(id, { status });
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(
        `updateStatus: datacenter ticket ${id} vanished immediately after update`,
      );
    }
    return updated;
  }

  async updateResponse(
    id: number,
    response: string,
  ): Promise<DatacenterTicketEntity> {
    await this.repository.update(id, { response });
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(
        `updateResponse: datacenter ticket ${id} vanished immediately after update`,
      );
    }
    return updated;
  }
}
