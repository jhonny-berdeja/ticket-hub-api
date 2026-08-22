import { PcboxApiService } from './pcbox-api.service';
import { PcboxApiConnector } from './pcbox-api.connector';
import { DatacenterTicketEntity } from '../../common/database/ticket/datacenter-ticket.entity';
import { DatabaseTicketEntity } from '../../common/database/ticket/database-ticket.entity';
import { KubernetesTicketEntity } from '../../common/database/ticket/kubernetes-ticket.entity';
import { TicketStatus } from '../../common/database/ticket/ticket-status.enum';

function buildResponse(status: number, body: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe('PcboxApiService — entity-class-aware routing', () => {
  it('forwards a flat body to createDatabaseAction for a DatabaseTicketEntity', async () => {
    const ticket = DatabaseTicketEntity.builder()
      .withNumber(5)
      .withInformer('ana@x.com')
      .withAssignee('Beto')
      .withDepartment('Datacenter')
      .withSubject('Read row')
      .withStatus(TicketStatus.APPROVED)
      .withDescription('desc')
      .withDbNamespace('pcbox-api')
      .withDbDeployment('pcbox-db')
      .withDbName('pcbox-db')
      .withSqlCode('SELECT 1;')
      .build();

    const createDatabaseAction = jest.fn().mockResolvedValue(
      buildResponse(201, {
        msg: 'ok',
        data: {
          execution: { success: true, exitCode: 0, stdout: '', stderr: '' },
        },
      }),
    );
    const createAdministration = jest.fn();
    const connector = {
      createDatabaseAction,
      createAdministration,
    } as unknown as PcboxApiConnector;
    const service = new PcboxApiService(connector);

    await service.notifyApproval(ticket);

    expect(createDatabaseAction).toHaveBeenCalledWith({
      ticketNumber: 5,
      department: 'Datacenter',
      informer: 'ana@x.com',
      approver: 'Beto',
      status: TicketStatus.APPROVED,
      namespace: 'pcbox-api',
      deployment: 'pcbox-db',
      dbName: 'pcbox-db',
      sqlCode: 'SELECT 1;',
    });
    expect(createAdministration).not.toHaveBeenCalled();
  });

  it('forwards a flat body to createAdministration for a DatacenterTicketEntity', async () => {
    const ticket = DatacenterTicketEntity.builder()
      .withNumber(6)
      .withInformer('ana@x.com')
      .withAssignee('Beto')
      .withDepartment('Datacenter')
      .withSubject('Restart')
      .withStatus(TicketStatus.APPROVED)
      .withDescription('desc')
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
    const createDatabaseAction = jest.fn();
    const connector = {
      createAdministration,
      createDatabaseAction,
    } as unknown as PcboxApiConnector;
    const service = new PcboxApiService(connector);

    await service.notifyApproval(ticket);

    expect(createAdministration).toHaveBeenCalledWith({
      ticketNumber: 6,
      department: 'Datacenter',
      informer: 'ana@x.com',
      approver: 'Beto',
      status: TicketStatus.APPROVED,
      fileContent: '- hosts: all',
    });
    expect(createDatabaseAction).not.toHaveBeenCalled();
  });

  it('forwards a flat body to createKubernetesAction for a KubernetesTicketEntity', async () => {
    const ticket = KubernetesTicketEntity.builder()
      .withNumber(7)
      .withInformer('ana@x.com')
      .withAssignee('Beto')
      .withDepartment('Datacenter')
      .withSubject('Deploy')
      .withStatus(TicketStatus.APPROVED)
      .withDescription('desc')
      .withCodeYaml('apiVersion: apps/v1')
      .build();

    const createKubernetesAction = jest.fn().mockResolvedValue(
      buildResponse(201, {
        msg: 'ok',
        data: {
          execution: { success: true, exitCode: 0, stdout: '', stderr: '' },
        },
      }),
    );
    const createAdministration = jest.fn();
    const createDatabaseAction = jest.fn();
    const connector = {
      createKubernetesAction,
      createAdministration,
      createDatabaseAction,
    } as unknown as PcboxApiConnector;
    const service = new PcboxApiService(connector);

    await service.notifyApproval(ticket);

    expect(createKubernetesAction).toHaveBeenCalledWith({
      ticketNumber: 7,
      department: 'Datacenter',
      informer: 'ana@x.com',
      approver: 'Beto',
      status: TicketStatus.APPROVED,
      fileContent: 'apiVersion: apps/v1',
    });
    expect(createAdministration).not.toHaveBeenCalled();
    expect(createDatabaseAction).not.toHaveBeenCalled();
  });
});
