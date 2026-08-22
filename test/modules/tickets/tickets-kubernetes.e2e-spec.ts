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
 * `POST /tickets/kubernetes` — the KUBERNETES counterpart of
 * `tickets-ansible.e2e-spec.ts`/`tickets-database.e2e-spec.ts`. Includes
 * the approval-forwarding assertion (pcbox-api's `POST /kubernetes`, flat
 * body) since it only makes sense against a KUBERNETES ticket created
 * through this endpoint.
 */
describe('POST /tickets/kubernetes (e2e, in-memory DB)', () => {
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

  it('happy path: any authenticated user creates a KUBERNETES ticket, numbered KB-1, status CREATED', async () => {
    const response = await request(app.getHttpServer())
      .post('/tickets/kubernetes')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        assignee: 'Ana Aprobadora',
        department: 'Datacenter',
        subject: 'Deploy pod',
        description: 'Necesito desplegar un pod',
        codeYaml: 'apiVersion: apps/v1\nkind: Deployment',
        executionType: 'MANIFEST',
      })
      .expect(201);

    expect(response.body).toEqual({
      msg: 'Ticket created successfully',
      data: {
        id: expect.any(Number) as number,
        number: 'KB-1',
        informer: CREATOR_EMAIL,
        assignee: 'Ana Aprobadora',
        department: 'Datacenter',
        subject: 'Deploy pod',
        status: 'CREATED',
        description: 'Necesito desplegar un pod',
        ticketType: 'KUBERNETES',
        codeAnsible: null,
        codeYaml: 'apiVersion: apps/v1\nkind: Deployment',
        response: null,
        namespace: null,
        deployment: null,
        dbName: null,
        sqlCode: null,
        executionType: 'MANIFEST',
      },
    });
  });

  it('creates and approves a KUBERNETES ticket, forwarding the flat action to pcbox-api at /kubernetes', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/tickets/kubernetes')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        assignee: 'Ana Aprobadora',
        department: 'Datacenter',
        subject: 'Deploy another pod',
        description: 'Necesito desplegar otro pod',
        codeYaml: 'apiVersion: apps/v1\nkind: Deployment',
        executionType: 'MANIFEST',
      })
      .expect(201);

    const createdBody = createResponse.body as {
      data: { id: number; ticketType: string; codeYaml: string };
    };
    expect(createdBody.data.ticketType).toBe('KUBERNETES');
    expect(createdBody.data.codeYaml).toBe(
      'apiVersion: apps/v1\nkind: Deployment',
    );

    mockPcboxApiSuccess(fetchSpy);

    await request(app.getHttpServer())
      .patch(`/tickets/kubernetes/${createdBody.data.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const [, requestInit] = fetchSpy.mock.calls.find(
      ([url]) => url === 'http://pcbox-api.test/kubernetes',
    )!;
    const sentBody = JSON.parse(
      (requestInit as RequestInit).body as string,
    ) as Record<string, unknown>;
    expect(sentBody).toEqual({
      ticketNumber: sentBody.ticketNumber,
      department: 'Datacenter',
      informer: CREATOR_EMAIL,
      approver: 'Ana Aprobadora',
      status: 'APPROVED',
      fileContent: 'apiVersion: apps/v1\nkind: Deployment',
    });
    expect(sentBody.ticketType).toBeUndefined();
    expect(sentBody.namespace).toBeUndefined();
  });

  it('creates and approves a KUBERNETES ticket with executionType ANSIBLE, forwarding the flat action to pcbox-api at /kubernetes/ansible', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/tickets/kubernetes')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        assignee: 'Ana Aprobadora',
        department: 'Datacenter',
        subject: 'Deploy via playbook',
        description: 'Necesito desplegar via playbook',
        codeYaml: 'apiVersion: apps/v1\nkind: Deployment',
        executionType: 'ANSIBLE',
      })
      .expect(201);

    const createdBody = createResponse.body as {
      data: { id: number; executionType: string };
    };
    expect(createdBody.data.executionType).toBe('ANSIBLE');

    mockPcboxApiSuccess(fetchSpy);

    await request(app.getHttpServer())
      .patch(`/tickets/kubernetes/${createdBody.data.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const ansibleCall = fetchSpy.mock.calls.find(
      ([url]) => url === 'http://pcbox-api.test/kubernetes/ansible',
    );
    expect(ansibleCall).toBeDefined();

    const [, requestInit] = ansibleCall!;
    const sentBody = JSON.parse(
      (requestInit as RequestInit).body as string,
    ) as Record<string, unknown>;
    expect(sentBody).toEqual({
      ticketNumber: sentBody.ticketNumber,
      department: 'Datacenter',
      informer: CREATOR_EMAIL,
      approver: 'Ana Aprobadora',
      status: 'APPROVED',
      fileContent: 'apiVersion: apps/v1\nkind: Deployment',
    });

    const manifestCall = fetchSpy.mock.calls.find(
      ([url]) => url === 'http://pcbox-api.test/kubernetes',
    );
    expect(manifestCall).toBeUndefined();
  });
});
