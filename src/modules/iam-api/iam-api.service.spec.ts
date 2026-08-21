import { IamApiService } from './iam-api.service';
import { IamApiConnector } from './iam-api.connector';

describe('IamApiService', () => {
  it('fetches internal-users hardcoded to applicationName=ticket-hub, roleName=ADMIN', async () => {
    const users = [
      { id: 1, name: 'Ana', lastname: 'Admin', email: 'ana@x.com' },
    ];
    const fetchInternalUsers = jest.fn().mockResolvedValue(users);
    const connector = {
      fetchInternalUsers,
    } as unknown as IamApiConnector;
    const service = new IamApiService(connector);

    const result = await service.fetchAssignableUsers();

    expect(fetchInternalUsers).toHaveBeenCalledWith('ticket-hub', 'ADMIN');
    expect(result).toBe(users);
  });
});
