import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketEntity } from './ticket.entity';
import { TicketStatus } from './ticket-status.enum';

@Injectable()
export class TicketsRepository {
  constructor(
    @InjectRepository(TicketEntity)
    private readonly repository: Repository<TicketEntity>,
  ) {}

  createTicket(ticket: TicketEntity): Promise<TicketEntity> {
    const entity = this.repository.create(ticket);
    return this.repository.save(entity);
  }

  async findMaxNumber(): Promise<number | null> {
    return this.repository.maximum('number');
  }

  findById(id: number): Promise<TicketEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  findByNumber(number: number): Promise<TicketEntity | null> {
    return this.repository.findOne({ where: { number } });
  }

  findByCreator(creator: number): Promise<TicketEntity[]> {
    return this.repository.find({ where: { creator } });
  }

  findAll(): Promise<TicketEntity[]> {
    return this.repository.find();
  }

  async updateStatus(id: number, status: TicketStatus): Promise<TicketEntity> {
    await this.repository.update(id, { status });
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(
        `updateStatus: ticket ${id} vanished immediately after update`,
      );
    }
    return updated;
  }

  async updateResponse(id: number, response: string): Promise<TicketEntity> {
    await this.repository.update(id, { response });
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(
        `updateResponse: ticket ${id} vanished immediately after update`,
      );
    }
    return updated;
  }
}
