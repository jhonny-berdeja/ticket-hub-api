import { TicketMapper } from './ticket.mapper';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { TicketType } from '../../common/database/ticket/ticket-type.enum';
import { OperationType } from '../../common/database/ticket/operation-type.enum';

function buildDatabaseDto(): CreateTicketDto {
  const dto = new CreateTicketDto();
  dto.assignee = 'Ana';
  dto.department = 'Datacenter';
  dto.subject = 'Read row';
  dto.description = 'Please read';
  dto.ticketType = TicketType.DATABASE;
  dto.namespace = 'pcbox-api';
  dto.deployment = 'pcbox-db';
  dto.dbName = 'pcbox-db';
  dto.operationType = OperationType.LECTURA;
  dto.sqlCode = 'SELECT 1;';
  return dto;
}

describe('TicketMapper — DATABASE field carrying', () => {
  it('toEntity carries every DATABASE field and leaves codeAnsible null', () => {
    const entity = TicketMapper.toEntity(buildDatabaseDto(), 7, 'ana@x.com', 1);

    expect(entity.ticketType).toBe(TicketType.DATABASE);
    expect(entity.codeAnsible).toBeNull();
    expect(entity.dbNamespace).toBe('pcbox-api');
    expect(entity.dbDeployment).toBe('pcbox-db');
    expect(entity.dbName).toBe('pcbox-db');
    expect(entity.operationType).toBe(OperationType.LECTURA);
    expect(entity.sqlCode).toBe('SELECT 1;');
  });

  it('toEntity defaults ticketType to ANSIBLE when the dto omits it', () => {
    const dto = new CreateTicketDto();
    dto.assignee = 'Ana';
    dto.department = 'Datacenter';
    dto.subject = 'Restart';
    dto.description = 'Please restart';
    dto.codeAnsible = '- hosts: all';

    const entity = TicketMapper.toEntity(dto, 7, 'ana@x.com', 1);

    expect(entity.ticketType).toBe(TicketType.ANSIBLE);
    expect(entity.dbNamespace).toBeNull();
  });

  it('toResponse surfaces the persisted DATABASE fields verbatim', () => {
    const entity = TicketMapper.toEntity(buildDatabaseDto(), 7, 'ana@x.com', 3);
    entity.id = 99;

    const response = TicketMapper.toResponse(entity);

    expect(response.number).toBe('TK-3');
    expect(response.namespace).toBe('pcbox-api');
    expect(response.deployment).toBe('pcbox-db');
    expect(response.dbName).toBe('pcbox-db');
    expect(response.operationType).toBe(OperationType.LECTURA);
    expect(response.sqlCode).toBe('SELECT 1;');
  });
});
