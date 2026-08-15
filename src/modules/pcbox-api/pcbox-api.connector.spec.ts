import { ConfigService } from '@nestjs/config';
import { PcboxApiConnector } from './pcbox-api.connector';

function buildConfigService(): ConfigService {
  const values: Record<string, string> = {
    PCBOX_API_URL: 'http://pcbox-api.test',
    PCBOX_API_ADMIN_KEY: 'test-admin-key',
  };
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

describe('PcboxApiConnector', () => {
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    fetchSpy = jest.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('POSTs to /pcbox with the admin key header and the body as JSON', async () => {
    fetchSpy.mockResolvedValue(new Response(null, { status: 201 }));
    const connector = new PcboxApiConnector(buildConfigService());

    const body = {
      ticketNumber: 1,
      department: 'Datacenter',
      approver: 'Beto',
      informer: 'Ana',
      status: 'APPROVED',
      fileContent: '- hosts: all\n  tasks: []\n',
    };
    await connector.createAdministration(body);

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://pcbox-api.test/pcbox',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'x-admin-api-key': 'test-admin-key',
        }) as unknown,
        body: JSON.stringify(body),
      }) as unknown,
    );
  });

  it('resolves with whatever Response fetch returns, without inspecting it', async () => {
    const response = new Response(null, { status: 422 });
    fetchSpy.mockResolvedValue(response);
    const connector = new PcboxApiConnector(buildConfigService());

    await expect(
      connector.createAdministration({
        ticketNumber: 1,
        department: 'Datacenter',
        approver: 'Beto',
        informer: 'Ana',
        status: 'APPROVED',
        fileContent: 'x',
      }),
    ).resolves.toBe(response);
  });

  it('propagates a fetch rejection as-is (network failure)', async () => {
    fetchSpy.mockRejectedValue(new Error('ECONNREFUSED'));
    const connector = new PcboxApiConnector(buildConfigService());

    await expect(
      connector.createAdministration({
        ticketNumber: 1,
        department: 'Datacenter',
        approver: 'Beto',
        informer: 'Ana',
        status: 'APPROVED',
        fileContent: 'x',
      }),
    ).rejects.toThrow('ECONNREFUSED');
  });
});
