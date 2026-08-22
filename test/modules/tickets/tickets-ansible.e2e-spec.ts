import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { TicketsModule } from '../../../src/modules/tickets/tickets.module';
import { bootstrapTestApp } from '../../common/bootstrap-test-app';
import { seedAuthenticatedUser } from '../../common/seed-authenticated-user';

const CREATOR_EMAIL = 'creator@example.com';

/**
 * `POST /tickets/ansible` — split out of the old single `POST /tickets`
 * (see `tickets.controller.ts`'s history). Approval/db-targets/listing
 * flows live in `tickets.e2e-spec.ts`; DATABASE creation lives in
 * `tickets-database.e2e-spec.ts`.
 */
describe('POST /tickets/ansible (e2e, in-memory DB)', () => {
  let app: INestApplication<App>;
  let creatorToken: string;

  beforeAll(async () => {
    process.env.PCBOX_API_URL = 'http://pcbox-api.test';
    process.env.AUTH_API_URL = 'http://auth-api.test';
    process.env.PCBOX_API_APPLICATION_NAME = 'pcbox-api';
    process.env.PCBOX_API_CLIENT_ID = 'test-client-id';
    process.env.PCBOX_API_CLIENT_SECRET = 'test-client-secret';

    ({ app } = await bootstrapTestApp([TicketsModule]));
    creatorToken = seedAuthenticatedUser(CREATOR_EMAIL, []);
  });

  afterAll(async () => {
    await app.close();
  });

  it('happy path: any authenticated user creates an ANSIBLE ticket, numbered DC-1, status CREATED', async () => {
    const response = await request(app.getHttpServer())
      .post('/tickets/ansible')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        assignee: 'Ana Aprobadora',
        department: 'Datacenter',
        subject: 'Servidor caído',
        description: 'El servidor de prod no responde',
        codeAnsible: 'playbook: restart.yml',
      })
      .expect(201);

    expect(response.body).toEqual({
      msg: 'Ticket created successfully',
      data: {
        id: expect.any(Number) as number,
        number: 'DC-1',
        informer: CREATOR_EMAIL,
        assignee: 'Ana Aprobadora',
        department: 'Datacenter',
        subject: 'Servidor caído',
        status: 'CREATED',
        description: 'El servidor de prod no responde',
        ticketType: 'ANSIBLE',
        codeAnsible: 'playbook: restart.yml',
        codeYaml: null,
        response: null,
        namespace: null,
        deployment: null,
        dbName: null,
        sqlCode: null,
      },
    });
  });
});
