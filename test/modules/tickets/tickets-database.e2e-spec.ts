import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { TicketsModule } from '../../../src/modules/tickets/tickets.module';
import { Role } from '../../../src/common/database/role/role.enum';
import { bootstrapTestApp } from '../../common/bootstrap-test-app';
import { seedAuthenticatedUser } from '../../common/seed-authenticated-user';

const CREATOR_EMAIL = 'creator@example.com';
const PCBOX_API_TOKEN = 'test-pcbox-api-token';

function authApiLoginSuccessResponse(): Response {
  return new Response(JSON.stringify({ access_token: PCBOX_API_TOKEN }), {
    status: 200,
  });
}

function pcboxApiSuccessResponse(): Response {
  return new Response(
    JSON.stringify({
      msg: 'Administration saved and playbook execution finished',
      data: {
        execution: {
          success: true,
          exitCode: 0,
          stdout: 'PLAY [all] ***',
          stderr: '',
        },
      },
    }),
    { status: 201 },
  );
}

function mockPcboxApiSuccess(fetchSpy: jest.SpiedFunction<typeof fetch>) {
  fetchSpy.mockImplementation((url: string) => {
    return Promise.resolve(
      url.endsWith('/apps-users/login')
        ? authApiLoginSuccessResponse()
        : pcboxApiSuccessResponse(),
    );
  });
}

/**
 * `POST /tickets/database` — split out of the old single `POST /tickets`
 * (see `tickets.controller.ts`'s history). Includes the approval-forwarding
 * assertion (pcbox-api's `POST /database`, flat body) since it only makes
 * sense against a DATABASE ticket created through this endpoint.
 */
describe('POST /tickets/database (e2e, in-memory DB)', () => {
  let app: INestApplication<App>;
  let creatorToken: string;
  let adminToken: string;
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeAll(async () => {
    process.env.PCBOX_API_URL = 'http://pcbox-api.test';
    process.env.AUTH_API_URL = 'http://auth-api.test';
    process.env.PCBOX_API_APPLICATION_NAME = 'pcbox-api';
    process.env.PCBOX_API_CLIENT_ID = 'test-client-id';
    process.env.PCBOX_API_CLIENT_SECRET = 'test-client-secret';

    ({ app } = await bootstrapTestApp([TicketsModule]));
    creatorToken = seedAuthenticatedUser(CREATOR_EMAIL, []);
    adminToken = seedAuthenticatedUser('admin@example.com', [Role.ADMIN]);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    fetchSpy = jest.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('creates and approves a DATABASE ticket, forwarding the flat action to pcbox-api at /database', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/tickets/database')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        assignee: 'Ana Aprobadora',
        department: 'Datacenter',
        subject: 'Read a row',
        description: 'Need to read one row',
        namespace: 'pcbox-api',
        deployment: 'pcbox-db',
        dbName: 'pcbox-db',
        sqlCode: 'SELECT 1;',
      })
      .expect(201);

    const createdBody = createResponse.body as {
      data: { id: number; ticketType: string; sqlCode: string };
    };
    expect(createdBody.data.ticketType).toBe('DATABASE');
    expect(createdBody.data.sqlCode).toBe('SELECT 1;');

    mockPcboxApiSuccess(fetchSpy);

    await request(app.getHttpServer())
      .patch(`/tickets/${createdBody.data.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const [, requestInit] = fetchSpy.mock.calls.find(
      ([url]) => url === 'http://pcbox-api.test/database',
    )!;
    const sentBody = JSON.parse(
      (requestInit as RequestInit).body as string,
    ) as Record<string, unknown>;
    expect(sentBody).toEqual({
      ticketNumber: 1,
      department: 'Datacenter',
      informer: CREATOR_EMAIL,
      approver: 'Ana Aprobadora',
      status: 'APPROVED',
      namespace: 'pcbox-api',
      deployment: 'pcbox-db',
      dbName: 'pcbox-db',
      sqlCode: 'SELECT 1;',
    });
    expect(sentBody.ticketType).toBeUndefined();
    expect(sentBody.database).toBeUndefined();
  });
});
