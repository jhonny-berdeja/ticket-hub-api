import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KubernetesTicketEntity } from './kubernetes-ticket.entity';
import { TicketStatus } from './ticket-status.enum';

@Injectable()
export class KubernetesTicketsRepository {
  constructor(
    @InjectRepository(KubernetesTicketEntity)
    private readonly repository: Repository<KubernetesTicketEntity>,
  ) {}

  createTicket(
    ticket: KubernetesTicketEntity,
  ): Promise<KubernetesTicketEntity> {
    const entity = this.repository.create(ticket);
    return this.repository.save(entity);
  }

  /** Own `MAX(number) + 1` sequence, independent of `datacenter_tickets`/`database_tickets`. */
  async findMaxNumber(): Promise<number | null> {
    return this.repository.maximum('number');
  }

  findById(id: number): Promise<KubernetesTicketEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  findByNumber(number: number): Promise<KubernetesTicketEntity | null> {
    return this.repository.findOne({ where: { number } });
  }

  findByInformer(informer: string): Promise<KubernetesTicketEntity[]> {
    return this.repository.find({ where: { informer } });
  }

  findAll(): Promise<KubernetesTicketEntity[]> {
    return this.repository.find();
  }

  async updateStatus(
    id: number,
    status: TicketStatus,
  ): Promise<KubernetesTicketEntity> {
    await this.repository.update(id, { status });
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(
        `updateStatus: kubernetes ticket ${id} vanished immediately after update`,
      );
    }
    return updated;
  }

  async updateResponse(
    id: number,
    response: string,
  ): Promise<KubernetesTicketEntity> {
    await this.repository.update(id, { response });
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(
        `updateResponse: kubernetes ticket ${id} vanished immediately after update`,
      );
    }
    return updated;
  }
}
