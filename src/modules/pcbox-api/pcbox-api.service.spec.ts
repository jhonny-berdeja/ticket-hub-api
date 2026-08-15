import { TicketEntity } from '../../common/database/ticket/ticket.entity';
import { TicketStatus } from '../../common/database/ticket/ticket-status.enum';
import { UserEntity } from '../../common/database/user/user.entity';
import { UsersRepository } from '../../common/database/user/users.repository';
import { PcboxApiConnector } from './pcbox-api.connector';
import { PcboxApiService } from './pcbox-api.service';

function buildTicket(overrides: Partial<TicketEntity> = {}): TicketEntity {
  const ticket = TicketEntity.builder()
    .withNumber(1)
    .withCreator(10)
    .withAssignee(20)
    .withDepartment('Datacenter')
    .withSubject('Servidor caído')
    .withStatus(TicketStatus.APPROVED)
    .withDescription('x')
    .withCodeAnsible('- hosts: all\n  tasks: []\n')
    .build();
  return Object.assign(ticket, overrides);
}

function buildUser(id: number, name: string): UserEntity {
  return Object.assign(
    UserEntity.builder()
      .withName(name)
      .withLastname('Y')
      .withEmail(`${name}@x.com`)
      .withPassword('hash')
      .build(),
    { id },
  );
}

describe('PcboxApiService', () => {
  function buildService(
    overrides: {
      createAdministration?: jest.Mock;
      findById?: jest.Mock;
    } = {},
  ) {
    const createAdministration = overrides.createAdministration ?? jest.fn();
    const findById =
      overrides.findById ??
      jest
        .fn()
        .mockImplementation((id: number) =>
          Promise.resolve(
            id === 10 ? buildUser(10, 'Ana') : buildUser(20, 'Beto'),
          ),
        );

    const connector = {
      createAdministration,
    } as unknown as PcboxApiConnector;
    const usersRepository = { findById } as unknown as UsersRepository;

    return {
      service: new PcboxApiService(connector, usersRepository),
      createAdministration,
      findById,
    };
  }

  it('resolves creator/assignee names and sends them as informer/approver', async () => {
    const createAdministration = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          msg: 'Administration saved and playbook execution finished',
          data: { execution: { success: true, exitCode: 0 } },
        }),
        { status: 201 },
      ),
    );
    const { service } = buildService({ createAdministration });

    const result = await service.notifyApproval(buildTicket());

    expect(createAdministration).toHaveBeenCalledWith({
      ticketNumber: 1,
      department: 'Datacenter',
      informer: 'Ana',
      approver: 'Beto',
      status: 'APPROVED',
      fileContent: '- hosts: all\n  tasks: []\n',
    });
    expect(result).toBe(
      'Administration saved and playbook execution finished (execution: success=true, exitCode=0)',
    );
  });

  it('describes a non-201 response using its error message', async () => {
    const createAdministration = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Ticket does not match' }), {
        status: 422,
      }),
    );
    const { service } = buildService({ createAdministration });

    const result = await service.notifyApproval(buildTicket());

    expect(result).toBe(
      'pcbox-api request failed with status 422: Ticket does not match',
    );
  });

  it('describes a non-201 response with an unparseable body using just the status', async () => {
    const createAdministration = jest
      .fn()
      .mockResolvedValue(new Response(null, { status: 500 }));
    const { service } = buildService({ createAdministration });

    const result = await service.notifyApproval(buildTicket());

    expect(result).toBe('pcbox-api request failed with status 500');
  });

  it('describes a connector rejection (network/timeout failure) without throwing', async () => {
    const createAdministration = jest
      .fn()
      .mockRejectedValue(new Error('ECONNREFUSED'));
    const { service } = buildService({ createAdministration });

    await expect(service.notifyApproval(buildTicket())).resolves.toBe(
      'pcbox-api unreachable: ECONNREFUSED',
    );
  });

  it('never calls pcbox-api when the ticket has no assignee', async () => {
    const createAdministration = jest.fn();
    const { service } = buildService({ createAdministration });

    const result = await service.notifyApproval(
      buildTicket({ assignee: null }),
    );

    expect(createAdministration).not.toHaveBeenCalled();
    expect(result).toBe(
      'pcbox-api not notified: could not resolve creator/assignee name',
    );
  });

  it('never calls pcbox-api when the creator or assignee no longer exists', async () => {
    const createAdministration = jest.fn();
    const findById = jest.fn().mockResolvedValue(null);
    const { service } = buildService({ createAdministration, findById });

    const result = await service.notifyApproval(buildTicket());

    expect(createAdministration).not.toHaveBeenCalled();
    expect(result).toBe(
      'pcbox-api not notified: could not resolve creator/assignee name',
    );
  });

  it('truncates the returned string to 600 characters', async () => {
    const createAdministration = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'x'.repeat(1000) }), {
        status: 400,
      }),
    );
    const { service } = buildService({ createAdministration });

    const result = await service.notifyApproval(buildTicket());

    expect(result.length).toBe(600);
  });
});
