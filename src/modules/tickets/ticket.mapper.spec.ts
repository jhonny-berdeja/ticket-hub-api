import { TicketMapper } from './ticket.mapper';
import { CreateAnsibleTicketDto } from './dto/create-ansible-ticket.dto';
import { CreateDatabaseTicketDto } from './dto/create-database-ticket.dto';
import { CreateKubernetesTicketDto } from './dto/create-kubernetes-ticket.dto';
import { TicketType } from '../../common/database/ticket/ticket-type.enum';

function buildKubernetesDto(): CreateKubernetesTicketDto {
  const dto = new CreateKubernetesTicketDto();
  dto.assignee = 'Ana';
  dto.department = 'Datacenter';
  dto.subject = 'Deploy';
  dto.description = 'Please deploy';
  dto.codeYaml = 'apiVersion: apps/v1';
  return dto;
}

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
  it('toDatabaseEntity carries every DATABASE field', () => {
    const entity = TicketMapper.toDatabaseEntity(
      buildDatabaseDto(),
      'ana@x.com',
      1,
    );

    expect(entity.informer).toBe('ana@x.com');
    expect(entity.dbNamespace).toBe('pcbox-api');
    expect(entity.dbDeployment).toBe('pcbox-db');
    expect(entity.dbName).toBe('pcbox-db');
    expect(entity.sqlCode).toBe('SELECT 1;');
  });

  it('toDatabaseResponse surfaces the persisted DATABASE fields verbatim and derives ticketType', () => {
    const entity = TicketMapper.toDatabaseEntity(
      buildDatabaseDto(),
      'ana@x.com',
      3,
    );
    entity.id = 99;

    const response = TicketMapper.toDatabaseResponse(entity);

    expect(response.number).toBe('DB-3');
    expect(response.ticketType).toBe(TicketType.DATABASE);
    expect(response.namespace).toBe('pcbox-api');
    expect(response.deployment).toBe('pcbox-db');
    expect(response.dbName).toBe('pcbox-db');
    expect(response.sqlCode).toBe('SELECT 1;');
    expect(response.codeAnsible).toBeNull();
    expect(response.codeYaml).toBeNull();
  });
});

describe('TicketMapper — ANSIBLE field carrying', () => {
  it('toAnsibleEntity carries the ANSIBLE fields', () => {
    const entity = TicketMapper.toAnsibleEntity(
      buildAnsibleDto(),
      'ana@x.com',
      1,
    );

    expect(entity.informer).toBe('ana@x.com');
    expect(entity.codeAnsible).toBe('- hosts: all');
  });

  it('toAnsibleResponse derives ticketType ANSIBLE and leaves DATABASE fields null', () => {
    const entity = TicketMapper.toAnsibleEntity(
      buildAnsibleDto(),
      'ana@x.com',
      1,
    );
    entity.id = 42;

    const response = TicketMapper.toAnsibleResponse(entity);

    expect(response.number).toBe('DC-1');
    expect(response.ticketType).toBe(TicketType.ANSIBLE);
    expect(response.codeAnsible).toBe('- hosts: all');
    expect(response.codeYaml).toBeNull();
    expect(response.namespace).toBeNull();
    expect(response.deployment).toBeNull();
    expect(response.dbName).toBeNull();
    expect(response.sqlCode).toBeNull();
  });
});

describe('TicketMapper — KUBERNETES field carrying', () => {
  it('toKubernetesEntity carries the KUBERNETES fields', () => {
    const entity = TicketMapper.toKubernetesEntity(
      buildKubernetesDto(),
      'ana@x.com',
      1,
    );

    expect(entity.informer).toBe('ana@x.com');
    expect(entity.codeYaml).toBe('apiVersion: apps/v1');
  });

  it('toKubernetesResponse derives ticketType KUBERNETES and leaves other-kind fields null', () => {
    const entity = TicketMapper.toKubernetesEntity(
      buildKubernetesDto(),
      'ana@x.com',
      1,
    );
    entity.id = 42;

    const response = TicketMapper.toKubernetesResponse(entity);

    expect(response.number).toBe('KB-1');
    expect(response.ticketType).toBe(TicketType.KUBERNETES);
    expect(response.codeYaml).toBe('apiVersion: apps/v1');
    expect(response.codeAnsible).toBeNull();
    expect(response.namespace).toBeNull();
    expect(response.deployment).toBeNull();
    expect(response.dbName).toBeNull();
    expect(response.sqlCode).toBeNull();
  });
});
