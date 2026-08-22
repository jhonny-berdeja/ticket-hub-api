import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { TicketsModule } from '../../../src/modules/tickets/tickets.module';
import { Role } from '../../../src/common/database/role/role.enum';
import { bootstrapTestApp } from '../../common/bootstrap-test-app';
import { seedAuthenticatedUser } from '../../common/seed-authenticated-user';

const CREATOR_EMAIL = 'creator@example.com';
const OTHER_USER_EMAIL = 'other-user@example.com';

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

/**
 * Routes the mocked fetch by URL: auth-api's login vs. pcbox-api's own
 * endpoint. `PcboxApiConnector` always calls `fetch` with a plain
 * string URL, never a `Request`/`URL` instance, so narrowing the
 * parameter type here (rather than the wider `RequestInfo | URL` jest
 * infers) is safe and avoids stringifying something that isn't a string.
 */
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
 * Real end-to-end: real `TicketsModule` against a real — if in-memory —
 * database. Only `fetch` is mocked, the one external boundary that
 * cannot run in this environment at all: `ApproveTicketService` calls
 * the real pcbox-api right after approval (see `PcboxApiService`).
 * DEV/APPROVER are gone (see `DatacenterTicketEntity`'s doc comment): any
 * authenticated user can create a ticket, only ADMIN approves, and
 * "own tickets vs. every ticket" now branches on ADMIN alone.
 *
 * Creation itself is covered by `tickets-ansible.e2e-spec.ts` and
 * `tickets-database.e2e-spec.ts` — this suite only covers what stayed
 * unified across both ticket types: listing, lookup-by-number, approval
 * and the db-targets/assignable-users proxies. Fixture tickets here are
 * created through `POST /tickets/ansible` since the type doesn't matter
 * to what's under test.
 */
describe('Tickets flow (e2e, in-memory DB)', () => {
  let app: INestApplication<App>;
  let creatorToken: string;
  let otherUserToken: string;
  let adminToken: string;
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  const validAnsibleTicketBody = () => ({
    assignee: 'Ana Aprobadora',
    department: 'Datacenter',
    subject: 'Servidor caído',
    description: 'El servidor de prod no responde',
    codeAnsible: 'playbook: restart.yml',
  });

  beforeAll(async () => {
    process.env.PCBOX_API_URL = 'http://pcbox-api.test';
    process.env.AUTH_API_URL = 'http://auth-api.test';
    process.env.PCBOX_API_APPLICATION_NAME = 'pcbox-api';
    process.env.PCBOX_API_CLIENT_ID = 'test-client-id';
    process.env.PCBOX_API_CLIENT_SECRET = 'test-client-secret';

    ({ app } = await bootstrapTestApp([TicketsModule]));

    creatorToken = seedAuthenticatedUser(CREATOR_EMAIL, []);
    otherUserToken = seedAuthenticatedUser(OTHER_USER_EMAIL, []);
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

  it('sets up ticket DC-1, created by creatorToken', async () => {
    const response = await request(app.getHttpServer())
      .post('/tickets/ansible')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send(validAnsibleTicketBody())
      .expect(201);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(response.body).toMatchObject({
      data: { number: 'DC-1', informer: CREATOR_EMAIL },
    });
  });

  it('non-ADMIN sees only their own ANSIBLE tickets; ADMIN sees every ANSIBLE ticket', async () => {
    // A second ticket, created by another non-admin, so there are two total.
    await request(app.getHttpServer())
      .post('/tickets/ansible')
      .set('Authorization', `Bearer ${otherUserToken}`)
      .send(validAnsibleTicketBody())
      .expect(201);

    const creatorResponse = await request(app.getHttpServer())
      .get('/tickets/ansible')
      .set('Authorization', `Bearer ${creatorToken}`)
      .expect(200);
    const creatorTickets = (
      creatorResponse.body as { data: { number: string }[] }
    ).data;
    expect(creatorTickets).toHaveLength(1);
    expect(creatorTickets[0].number).toBe('DC-1');

    const adminResponse = await request(app.getHttpServer())
      .get('/tickets/ansible')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const adminTickets = (adminResponse.body as { data: { number: string }[] })
      .data;
    expect(adminTickets).toHaveLength(2);
  });

  it('rejects a non-ADMIN looking up a ticket by number that is not theirs', async () => {
    await request(app.getHttpServer())
      .get('/tickets/ansible/by-number/2')
      .set('Authorization', `Bearer ${creatorToken}`)
      .expect(404);
  });

  it('lets an ADMIN look up any ticket by number', async () => {
    const response = await request(app.getHttpServer())
      .get('/tickets/ansible/by-number/1')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect((response.body as { data: { number: string } }).data.number).toBe(
      'DC-1',
    );
  });

  it('404s looking up an ansible ticket number that does not exist', async () => {
    await request(app.getHttpServer())
      .get('/tickets/ansible/by-number/999')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('resolves each route to its own table when both tickets share the same bare number', async () => {
    await request(app.getHttpServer())
      .post('/tickets/database')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        assignee: 'Ana',
        department: 'Datacenter',
        subject: 'Read row',
        description: 'Please read',
        namespace: 'pcbox-api',
        deployment: 'pcbox-db',
        dbName: 'pcbox-db',
        sqlCode: 'SELECT 1;',
      })
      .expect(201);

    // The database ticket just created shares bare number 1 with the
    // existing datacenter ticket — each route must keep resolving to its
    // own table, never falling through to the other one.
    const ansibleResponse = await request(app.getHttpServer())
      .get('/tickets/ansible/by-number/1')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(
      (ansibleResponse.body as { data: { ticketType: string } }).data,
    ).toEqual(expect.objectContaining({ ticketType: 'ANSIBLE' }));

    const databaseResponse = await request(app.getHttpServer())
      .get('/tickets/database/by-number/1')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(
      (databaseResponse.body as { data: { ticketType: string } }).data,
    ).toEqual(expect.objectContaining({ ticketType: 'DATABASE' }));
  });

  it('non-ADMIN sees only their own DATABASE tickets; ADMIN sees every DATABASE ticket', async () => {
    // DB-1 already exists (created by creatorToken in the previous test).
    // A second one, created by another non-admin, so there are two total.
    await request(app.getHttpServer())
      .post('/tickets/database')
      .set('Authorization', `Bearer ${otherUserToken}`)
      .send({
        assignee: 'Ana',
        department: 'Datacenter',
        subject: 'Read another row',
        description: 'Please read',
        namespace: 'pcbox-api',
        deployment: 'pcbox-db',
        dbName: 'pcbox-db',
        sqlCode: 'SELECT 2;',
      })
      .expect(201);

    const creatorResponse = await request(app.getHttpServer())
      .get('/tickets/database')
      .set('Authorization', `Bearer ${creatorToken}`)
      .expect(200);
    const creatorTickets = (
      creatorResponse.body as { data: { number: string }[] }
    ).data;
    expect(creatorTickets).toHaveLength(1);
    expect(creatorTickets[0].number).toBe('DB-1');

    const adminResponse = await request(app.getHttpServer())
      .get('/tickets/database')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const adminTickets = (adminResponse.body as { data: { number: string }[] })
      .data;
    expect(adminTickets).toHaveLength(2);
  });

  it('rejects approval from a non-ADMIN', async () => {
    await request(app.getHttpServer())
      .patch('/tickets/ansible/1/approve')
      .set('Authorization', `Bearer ${creatorToken}`)
      .expect(403);
  });

  it('happy path: ADMIN approves a ticket, and pcbox-api gets notified', async () => {
    mockPcboxApiSuccess(fetchSpy);

    const response = await request(app.getHttpServer())
      .patch('/tickets/ansible/1/approve')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const body = response.body as {
      data: { status: string; response: string | null };
    };
    expect(body.data.status).toBe('APPROVED');
    expect(body.data.response).toBe(
      [
        'Administration saved and playbook execution finished (execution: success=true, exitCode=0)',
        '--- stdout ---',
        'PLAY [all] ***',
        '--- stderr ---',
        '',
      ].join('\n'),
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://auth-api.test/apps-users/login',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-Application-Name': 'pcbox-api',
        }) as unknown,
        body: JSON.stringify({
          clienteId: 'test-client-id',
          clienteSecret: 'test-client-secret',
        }),
      }) as unknown,
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://pcbox-api.test/pcbox',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: `Bearer ${PCBOX_API_TOKEN}`,
        }) as unknown,
        body: JSON.stringify({
          ticketNumber: 1,
          department: 'Datacenter',
          informer: CREATOR_EMAIL,
          approver: 'Ana Aprobadora',
          status: 'APPROVED',
          fileContent: 'playbook: restart.yml',
        }),
      }) as unknown,
    );
  });

  it('approval still succeeds even when pcbox-api is unreachable — the failure just lands in response', async () => {
    fetchSpy.mockRejectedValue(new Error('ECONNREFUSED'));

    const response = await request(app.getHttpServer())
      .patch('/tickets/ansible/2/approve')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const body = response.body as {
      data: { status: string; response: string | null };
    };
    expect(body.data.status).toBe('APPROVED');
    expect(body.data.response).toBe('pcbox-api unreachable: ECONNREFUSED');
  });

  it('approves each route to its own table when both a datacenter and a database ticket share the same bare id', async () => {
    // Datacenter ticket #2 (DC-2) was just approved above. Database ticket
    // #2 (DB-2, created earlier in this suite) shares the same bare `id`
    // but lives in a different table — approving it must never fall
    // through to (or be satisfied by) the already-approved datacenter row.
    mockPcboxApiSuccess(fetchSpy);

    const response = await request(app.getHttpServer())
      .patch('/tickets/database/2/approve')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const body = response.body as {
      data: { id: number; ticketType: string; status: string };
    };
    expect(body.data).toEqual(
      expect.objectContaining({
        id: 2,
        ticketType: 'DATABASE',
        status: 'APPROVED',
      }),
    );

    // The datacenter ticket sharing id 2 stays exactly as approved before,
    // untouched by this second approval.
    const ansibleResponse = await request(app.getHttpServer())
      .get('/tickets/ansible/by-number/2')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(
      (ansibleResponse.body as { data: { ticketType: string; status: string } })
        .data,
    ).toEqual(
      expect.objectContaining({ ticketType: 'ANSIBLE', status: 'APPROVED' }),
    );
  });

  it("GET /tickets/db-targets proxies pcbox-api's allowlist verbatim, from /database/db-targets", async () => {
    const targets = [
      {
        namespace: 'ticket-hub',
        deployment: 'ticket-hub-db',
        dbName: 'ticket-hub-db',
      },
      { namespace: 'pcbox-api', deployment: 'pcbox-db', dbName: 'pcbox-db' },
    ];
    fetchSpy.mockImplementation((url: string) => {
      if (url.endsWith('/apps-users/login')) {
        return Promise.resolve(authApiLoginSuccessResponse());
      }
      return Promise.resolve(
        new Response(JSON.stringify({ msg: 'ok', data: targets }), {
          status: 200,
        }),
      );
    });

    const response = await request(app.getHttpServer())
      .get('/tickets/db-targets')
      .set('Authorization', `Bearer ${creatorToken}`)
      .expect(200);

    expect(response.body).toEqual({
      msg: 'Allowlisted database targets retrieved successfully',
      data: targets,
    });
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://pcbox-api.test/database/db-targets',
      expect.objectContaining({ method: 'GET' }) as unknown,
    );
  });

  it('GET /tickets/assignable-users proxies iam-api ADMINs of ticket-hub, wrapped in ResponseBody', async () => {
    const internalUsers = [
      { id: 1, name: 'Ana', lastname: 'Admin', email: 'ana@x.com' },
      { id: 2, name: 'Beto', lastname: 'Admin', email: 'beto@x.com' },
    ];
    fetchSpy.mockImplementation((url: string) => {
      if (url.endsWith('/apps-users/login')) {
        return Promise.resolve(authApiLoginSuccessResponse());
      }
      return Promise.resolve(
        new Response(JSON.stringify(internalUsers), { status: 200 }),
      );
    });

    const response = await request(app.getHttpServer())
      .get('/tickets/assignable-users')
      .set('Authorization', `Bearer ${creatorToken}`)
      .expect(200);

    expect(response.body).toEqual({
      msg: 'Assignable users retrieved successfully',
      data: internalUsers,
    });
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://auth-api.test/internal-users?applicationName=ticket-hub&roleName=ADMIN',
      expect.objectContaining({ method: 'GET' }) as unknown,
    );
  });

  it('404s approving an ansible ticket that does not exist', async () => {
    await request(app.getHttpServer())
      .patch('/tickets/ansible/999/approve')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('404s approving a database ticket that does not exist', async () => {
    await request(app.getHttpServer())
      .patch('/tickets/database/999/approve')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
