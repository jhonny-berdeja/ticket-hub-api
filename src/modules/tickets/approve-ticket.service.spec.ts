import { NotFoundException } from '@nestjs/common';
import { TicketEntity } from '../../common/database/ticket/ticket.entity';
import { TicketsRepository } from '../../common/database/ticket/tickets.repository';
import { TicketStatus } from '../../common/database/ticket/ticket-status.enum';
import { PcboxApiService } from '../pcbox-api/pcbox-api.service';
import { ApproveTicketService } from './approve-ticket.service';

function buildTicket(overrides: Partial<TicketEntity> = {}): TicketEntity {
  const ticket = TicketEntity.builder()
    .withNumber(1)
    .withCreator(10)
    .withAssignee(20)
    .withDepartment('Datacenter')
    .withSubject('Servidor caído')
    .withStatus(TicketStatus.CREATED)
    .withDescription('x')
    .withCodeAnsible('- hosts: all\n  tasks: []\n')
    .build();
  return Object.assign(ticket, { id: 1 }, overrides);
}

describe('ApproveTicketService', () => {
  function buildService(
    overrides: {
      findById?: jest.Mock;
      updateStatus?: jest.Mock;
      updateResponse?: jest.Mock;
      notifyApproval?: jest.Mock;
    } = {},
  ) {
    const findById =
      overrides.findById ?? jest.fn().mockResolvedValue(buildTicket());
    const updateStatus =
      overrides.updateStatus ??
      jest
        .fn()
        .mockResolvedValue(buildTicket({ status: TicketStatus.APPROVED }));
    const updateResponse =
      overrides.updateResponse ??
      jest
        .fn()
        .mockImplementation((id: number, response: string) =>
          Promise.resolve(
            buildTicket({ status: TicketStatus.APPROVED, response }),
          ),
        );
    const notifyApproval =
      overrides.notifyApproval ?? jest.fn().mockResolvedValue('ok');

    const ticketsRepository = {
      findById,
      updateStatus,
      updateResponse,
    } as unknown as TicketsRepository;
    const pcboxApiService = {
      notifyApproval,
    } as unknown as PcboxApiService;

    return {
      service: new ApproveTicketService(ticketsRepository, pcboxApiService),
      findById,
      updateStatus,
      updateResponse,
      notifyApproval,
    };
  }

  it('404s when the ticket does not exist, never touching status/pcbox-api', async () => {
    const findById = jest.fn().mockResolvedValue(null);
    const { service, updateStatus, notifyApproval } = buildService({
      findById,
    });

    await expect(service.approve(1)).rejects.toThrow(NotFoundException);
    expect(updateStatus).not.toHaveBeenCalled();
    expect(notifyApproval).not.toHaveBeenCalled();
  });

  it('updates status to APPROVED before notifying pcbox-api', async () => {
    const callOrder: string[] = [];
    const { service, updateStatus } = buildService({
      updateStatus: jest.fn().mockImplementation(() => {
        callOrder.push('updateStatus');
        return Promise.resolve(buildTicket({ status: TicketStatus.APPROVED }));
      }),
      notifyApproval: jest.fn().mockImplementation(() => {
        callOrder.push('notifyApproval');
        return Promise.resolve('ok');
      }),
    });

    await service.approve(1);

    expect(callOrder).toEqual(['updateStatus', 'notifyApproval']);
    expect(updateStatus).toHaveBeenCalledWith(1, TicketStatus.APPROVED);
  });

  it('persists whatever notifyApproval returns as the response', async () => {
    const notifyApproval = jest
      .fn()
      .mockResolvedValue('pcbox-api unreachable: ECONNREFUSED');
    const { service, updateResponse } = buildService({ notifyApproval });

    await service.approve(1);

    expect(updateResponse).toHaveBeenCalledWith(
      1,
      'pcbox-api unreachable: ECONNREFUSED',
    );
  });

  it('still resolves successfully even when notifyApproval describes a failure — approval never fails because of pcbox-api', async () => {
    const notifyApproval = jest
      .fn()
      .mockResolvedValue('pcbox-api request failed with status 500');
    const { service } = buildService({ notifyApproval });

    await expect(service.approve(1)).resolves.toEqual(
      expect.objectContaining({ msg: 'Ticket approved successfully' }),
    );
  });

  it('returns the final ticket (post status + response update) in the response body', async () => {
    const { service } = buildService({
      notifyApproval: jest.fn().mockResolvedValue('all good'),
    });

    const result = await service.approve(1);

    expect(result.data).toEqual(
      expect.objectContaining({ status: 'APPROVED', response: 'all good' }),
    );
  });
});
