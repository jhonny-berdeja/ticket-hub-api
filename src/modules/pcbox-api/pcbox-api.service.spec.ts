import { PcboxApiService } from './pcbox-api.service';
import { PcboxApiConnector } from './pcbox-api.connector';
import { TicketEntity } from '../../common/database/ticket/ticket.entity';
import { TicketStatus } from '../../common/database/ticket/ticket-status.enum';
import { TicketType } from '../../common/database/ticket/ticket-type.enum';
import { OperationType } from '../../common/database/ticket/operation-type.enum';

function buildResponse(status: number, body: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe('PcboxApiService — ticketType-aware request body', () => {
  it('forwards the structured `database` action for a DATABASE ticket, with ticketType set', async () => {
    const ticket = TicketEntity.builder()
      .withNumber(5)
      .withCreator(1)
      .withInformer('ana@x.com')
      .withAssignee('Beto')
      .withDepartment('Datacenter')
      .withSubject('Read row')
      .withStatus(TicketStatus.APPROVED)
      .withDescription('desc')
      .withTicketType(TicketType.DATABASE)
      .withDbNamespace('pcbox-api')
      .withDbDeployment('pcbox-db')
      .withDbName('pcbox-db')
      .withOperationType(OperationType.LECTURA)
      .withSqlCode('SELECT 1;')
      .build();

    const createAdministration = jest.fn().mockResolvedValue(
      buildResponse(201, {
        msg: 'ok',
        data: {
          execution: { success: true, exitCode: 0, stdout: '', stderr: '' },
        },
      }),
    );
    const connector = { createAdministration } as unknown as PcboxApiConnector;
    const service = new PcboxApiService(connector);

    await service.notifyApproval(ticket);

    expect(createAdministration).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketType: TicketType.DATABASE,
        database: {
          namespace: 'pcbox-api',
          deployment: 'pcbox-db',
          dbName: 'pcbox-db',
          operationType: OperationType.LECTURA,
          sqlCode: 'SELECT 1;',
        },
      }),
    );
  });

  it('still forwards `fileContent` for an ANSIBLE ticket, with ticketType set', async () => {
    const ticket = TicketEntity.builder()
      .withNumber(6)
      .withCreator(1)
      .withInformer('ana@x.com')
      .withAssignee('Beto')
      .withDepartment('Datacenter')
      .withSubject('Restart')
      .withStatus(TicketStatus.APPROVED)
      .withDescription('desc')
      .withTicketType(TicketType.ANSIBLE)
      .withCodeAnsible('- hosts: all')
      .build();

    const createAdministration = jest.fn().mockResolvedValue(
      buildResponse(201, {
        msg: 'ok',
        data: {
          execution: { success: true, exitCode: 0, stdout: '', stderr: '' },
        },
      }),
    );
    const connector = { createAdministration } as unknown as PcboxApiConnector;
    const service = new PcboxApiService(connector);

    await service.notifyApproval(ticket);

    expect(createAdministration).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketType: TicketType.ANSIBLE,
        fileContent: '- hosts: all',
      }),
    );
  });
});
