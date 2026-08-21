import { TicketMapper } from './ticket.mapper';
import { CreateAnsibleTicketDto } from './dto/create-ansible-ticket.dto';
import { CreateDatabaseTicketDto } from './dto/create-database-ticket.dto';
import { TicketType } from '../../common/database/ticket/ticket-type.enum';

function buildDatabaseDto(): CreateDatabaseTicketDto {
  const dto = new CreateDatabaseTicketDto();
  dto.assignee = 'Ana';
  dto.department = 'Datacenter';
  dto.subject = 'Read row';
  dto.description = 'Please read';
  dto.namespace = 'pcbox-api';
  dto.deployment = 'pcbox-db';
  dto.dbName = 'pcbox-db';
  dto.sqlCode = 'SELECT 1;';
  return dto;
}

function buildAnsibleDto(): CreateAnsibleTicketDto {
  const dto = new CreateAnsibleTicketDto();
  dto.assignee = 'Ana';
  dto.department = 'Datacenter';
  dto.subject = 'Restart';
  dto.description = 'Please restart';
  dto.codeAnsible = '- hosts: all';
  return dto;
}

describe('TicketMapper — DATABASE field carrying', () => {
  it('toDatabaseEntity carries every DATABASE field and leaves codeAnsible null', () => {
    const entity = TicketMapper.toDatabaseEntity(
      buildDatabaseDto(),
      7,
      'ana@x.com',
      1,
    );

    expect(entity.ticketType).toBe(TicketType.DATABASE);
    expect(entity.codeAnsible).toBeNull();
    expect(entity.dbNamespace).toBe('pcbox-api');
    expect(entity.dbDeployment).toBe('pcbox-db');
    expect(entity.dbName).toBe('pcbox-db');
    expect(entity.sqlCode).toBe('SELECT 1;');
  });

  it('toResponse surfaces the persisted DATABASE fields verbatim', () => {
    const entity = TicketMapper.toDatabaseEntity(
      buildDatabaseDto(),
      7,
      'ana@x.com',
      3,
    );
    entity.id = 99;

    const response = TicketMapper.toResponse(entity);

    expect(response.number).toBe('TK-3');
    expect(response.namespace).toBe('pcbox-api');
    expect(response.deployment).toBe('pcbox-db');
    expect(response.dbName).toBe('pcbox-db');
    expect(response.sqlCode).toBe('SELECT 1;');
  });
});

describe('TicketMapper — ANSIBLE field carrying', () => {
  it('toAnsibleEntity sets ticketType to ANSIBLE and leaves DATABASE fields null', () => {
    const entity = TicketMapper.toAnsibleEntity(
      buildAnsibleDto(),
      7,
      'ana@x.com',
      1,
    );

    expect(entity.ticketType).toBe(TicketType.ANSIBLE);
    expect(entity.codeAnsible).toBe('- hosts: all');
    expect(entity.dbNamespace).toBeNull();
    expect(entity.dbDeployment).toBeNull();
    expect(entity.dbName).toBeNull();
    expect(entity.sqlCode).toBeNull();
  });
});
