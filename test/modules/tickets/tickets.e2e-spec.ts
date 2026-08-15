import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { UsersModule } from '../../../src/modules/users/users.module';
import { TicketsModule } from '../../../src/modules/tickets/tickets.module';
import { Role } from '../../../src/common/database/role/role.enum';
import { bootstrapTestApp } from '../../common/bootstrap-test-app';
import { seedAuthenticatedUser } from '../../common/seed-authenticated-user';

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
 * Real end-to-end: real `TicketsModule`/`UsersModule` against a real —
 * if in-memory — database. Only `fetch` is mocked, the one external
 * boundary that cannot run in this environment at all: `ApproveTicketService`
 * calls the real pcbox-api right after approval (see `PcboxApiService`).
 */
describe('Tickets flow (e2e, in-memory DB)', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;
  let devToken: string;
  let otherDevToken: string;
  let approverToken: string;
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  const validTicketBody = () => ({
    assignee: 1, // the seeded APPROVER is always created first, id 1
    department: 'Datacenter',
    subject: 'Servidor caído',
    description: 'El servidor de prod no responde',
    codeAnsible: 'playbook: restart.yml',
  });

  beforeAll(async () => {
    process.env.PCBOX_API_URL = 'http://pcbox-api.test';
    process.env.PCBOX_API_ADMIN_KEY = 'test-pcbox-admin-key';

    ({ app, moduleFixture } = await bootstrapTestApp([
      UsersModule,
      TicketsModule,
    ]));

    // Seeded first on purpose so its id is 1, matching validTicketBody()'s
    // hardcoded assignee - same deterministic-id-order reasoning as
    // users.e2e-spec.ts's own final test.
    approverToken = await seedAuthenticatedUser(
      app,
      moduleFixture,
      'approver@example.com',
      [Role.APPROVER],
    );
    devToken = await seedAuthenticatedUser(
      app,
      moduleFixture,
      'dev@example.com',
      [Role.DEV],
    );
    otherDevToken = await seedAuthenticatedUser(
      app,
      moduleFixture,
      'other-dev@example.com',
      [Role.DEV],
    );
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

  it('rejects ticket creation from a non-DEV', async () => {
    await request(app.getHttpServer())
      .post('/tickets')
      .set('Authorization', `Bearer ${approverToken}`)
      .send(validTicketBody())
      .expect(403);
  });

  it('rejects an assignee who is not APPROVER/ADMIN', async () => {
    await request(app.getHttpServer())
      .post('/tickets')
      .set('Authorization', `Bearer ${devToken}`)
      .send({ ...validTicketBody(), assignee: 2 }) // the other DEV, id 2
      .expect(400);
  });

  it('happy path: DEV creates a ticket, numbered TK-1, status CREATED', async () => {
    const response = await request(app.getHttpServer())
      .post('/tickets')
      .set('Authorization', `Bearer ${devToken}`)
      .send(validTicketBody())
      .expect(201);

    expect(response.body).toEqual({
      msg: 'Ticket created successfully',
      data: {
        id: expect.any(Number) as number,
        number: 'TK-1',
        creator: expect.any(Number) as number,
        assignee: 1,
        department: 'Datacenter',
        subject: 'Servidor caído',
        status: 'CREATED',
        description: 'El servidor de prod no responde',
        codeAnsible: 'playbook: restart.yml',
        response: null,
      },
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('DEV sees only their own tickets; APPROVER sees every ticket', async () => {
    // A second ticket, created by the other DEV, so there are two total.
    await request(app.getHttpServer())
      .post('/tickets')
      .set('Authorization', `Bearer ${otherDevToken}`)
      .send(validTicketBody())
      .expect(201);

    const devResponse = await request(app.getHttpServer())
      .get('/tickets')
      .set('Authorization', `Bearer ${devToken}`)
      .expect(200);
    const devTickets = (devResponse.body as { data: { number: string }[] })
      .data;
    expect(devTickets).toHaveLength(1);
    expect(devTickets[0].number).toBe('TK-1');

    const approverResponse = await request(app.getHttpServer())
      .get('/tickets')
      .set('Authorization', `Bearer ${approverToken}`)
      .expect(200);
    const approverTickets = (
      approverResponse.body as { data: { number: string }[] }
    ).data;
    expect(approverTickets).toHaveLength(2);
  });

  it('rejects a DEV looking up a ticket by number that is not theirs', async () => {
    await request(app.getHttpServer())
      .get('/tickets/by-number/2')
      .set('Authorization', `Bearer ${devToken}`)
      .expect(404);
  });

  it('lets an APPROVER look up any ticket by number', async () => {
    const response = await request(app.getHttpServer())
      .get('/tickets/by-number/1')
      .set('Authorization', `Bearer ${approverToken}`)
      .expect(200);

    expect((response.body as { data: { number: string } }).data.number).toBe(
      'TK-1',
    );
  });

  it('rejects approval from a DEV', async () => {
    await request(app.getHttpServer())
      .patch('/tickets/1/approve')
      .set('Authorization', `Bearer ${devToken}`)
      .expect(403);
  });

  it('happy path: APPROVER approves a ticket, and pcbox-api gets notified', async () => {
    fetchSpy.mockResolvedValue(pcboxApiSuccessResponse());

    const response = await request(app.getHttpServer())
      .patch('/tickets/1/approve')
      .set('Authorization', `Bearer ${approverToken}`)
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
      'http://pcbox-api.test/pcbox',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-admin-api-key': 'test-pcbox-admin-key',
        }) as unknown,
        body: JSON.stringify({
          ticketNumber: 1,
          department: 'Datacenter',
          // seedAuthenticatedUser hardcodes name: 'Seed' for every user
          // it creates, creator and assignee both resolve to it here.
          informer: 'Seed',
          approver: 'Seed',
          status: 'APPROVED',
          fileContent: 'playbook: restart.yml',
        }),
      }) as unknown,
    );
  });

  it('approval still succeeds even when pcbox-api is unreachable — the failure just lands in response', async () => {
    fetchSpy.mockRejectedValue(new Error('ECONNREFUSED'));

    const response = await request(app.getHttpServer())
      .patch('/tickets/2/approve')
      .set('Authorization', `Bearer ${approverToken}`)
      .expect(200);

    const body = response.body as {
      data: { status: string; response: string | null };
    };
    expect(body.data.status).toBe('APPROVED');
    expect(body.data.response).toBe('pcbox-api unreachable: ECONNREFUSED');
  });

  it('404s approving a ticket that does not exist', async () => {
    await request(app.getHttpServer())
      .patch('/tickets/999/approve')
      .set('Authorization', `Bearer ${approverToken}`)
      .expect(404);

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
