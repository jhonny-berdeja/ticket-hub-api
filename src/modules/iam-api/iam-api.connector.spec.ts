import { ConfigService } from '@nestjs/config';
import { IamApiConnector } from './iam-api.connector';
import { AuthApiLoginService } from '../../common/auth-api/auth-api-login.service';

function buildResponse(status: number, body: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe('IamApiConnector', () => {
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    fetchSpy = jest.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('logs in, then GETs /internal-users with applicationName/roleName query params and a bearer token', async () => {
    fetchSpy.mockResolvedValue(
      buildResponse(200, [
        { id: 1, name: 'Ana', lastname: 'Admin', email: 'ana@x.com' },
      ]),
    );
    const login = jest.fn().mockResolvedValue('test-token');
    const authApiLoginService = { login } as unknown as AuthApiLoginService;
    const configService = {
      get: (key: string) =>
        key === 'AUTH_API_URL' ? 'http://auth-api.test' : undefined,
    } as unknown as ConfigService;
    const connector = new IamApiConnector(configService, authApiLoginService);

    const users = await connector.fetchInternalUsers('ticket-hub', 'ADMIN');

    expect(login).toHaveBeenCalled();
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://auth-api.test/internal-users?applicationName=ticket-hub&roleName=ADMIN',
      expect.objectContaining({
        method: 'GET',
        headers: { Authorization: 'Bearer test-token' },
      }) as unknown,
    );
    expect(users).toEqual([
      { id: 1, name: 'Ana', lastname: 'Admin', email: 'ana@x.com' },
    ]);
  });

  it('throws when iam-api responds with a non-ok status', async () => {
    fetchSpy.mockResolvedValue(buildResponse(500, {}));
    const authApiLoginService = {
      login: jest.fn().mockResolvedValue('test-token'),
    } as unknown as AuthApiLoginService;
    const configService = {
      get: () => 'http://auth-api.test',
    } as unknown as ConfigService;
    const connector = new IamApiConnector(configService, authApiLoginService);

    await expect(
      connector.fetchInternalUsers('ticket-hub', 'ADMIN'),
    ).rejects.toThrow('Failed to fetch internal-users: status 500');
  });
});
