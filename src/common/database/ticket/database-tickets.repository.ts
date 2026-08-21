import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DatabaseTicketEntity } from './database-ticket.entity';
import { TicketStatus } from './ticket-status.enum';

@Injectable()
export class DatabaseTicketsRepository {
  constructor(
    @InjectRepository(DatabaseTicketEntity)
    private readonly repository: Repository<DatabaseTicketEntity>,
  ) {}

  createTicket(ticket: DatabaseTicketEntity): Promise<DatabaseTicketEntity> {
    const entity = this.repository.create(ticket);
    return this.repository.save(entity);
  }

  /** Own `MAX(number) + 1` sequence, independent of `datacenter_tickets`. */
  async findMaxNumber(): Promise<number | null> {
    return this.repository.maximum('number');
  }

  findById(id: number): Promise<DatabaseTicketEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  findByNumber(number: number): Promise<DatabaseTicketEntity | null> {
    return this.repository.findOne({ where: { number } });
  }

  findByInformer(informer: string): Promise<DatabaseTicketEntity[]> {
    return this.repository.find({ where: { informer } });
  }

  findAll(): Promise<DatabaseTicketEntity[]> {
    return this.repository.find();
  }

  async updateStatus(
    id: number,
    status: TicketStatus,
  ): Promise<DatabaseTicketEntity> {
    await this.repository.update(id, { status });
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(
        `updateStatus: database ticket ${id} vanished immediately after update`,
      );
    }
    return updated;
  }

  async updateResponse(
    id: number,
    response: string,
  ): Promise<DatabaseTicketEntity> {
    await this.repository.update(id, { response });
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(
        `updateResponse: database ticket ${id} vanished immediately after update`,
      );
    }
    return updated;
  }
}
