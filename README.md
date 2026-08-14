<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Environment variables

This app runs **only** as a Pod in the microk8s `ticket-hub` namespace. There is
no local dev environment, no docker-compose Postgres, and no `.env` file —
every value below arrives as a container env var injected by the Deployment
manifest (`ConfigModule.forRoot({ ignoreEnvFile: true, validate })` fails fast
at boot if any is missing).

| Var | Required | Source (in-cluster) | Description |
|---|---|---|---|
| `POSTGRES_USER` | Yes | `envFrom: secretRef: ticket-hub-db-credentials` | Postgres role used to connect to `ticket-hub-db` |
| `POSTGRES_PASSWORD` | Yes | `envFrom: secretRef: ticket-hub-db-credentials` | Password for `POSTGRES_USER` |
| `DATABASE_HOST` | Yes | literal `env:` → `ticket-hub-db.ticket-hub.svc.cluster.local` | Postgres Service DNS name |
| `DATABASE_PORT` | Yes | literal `env:` → `5432` | Postgres port |
| `DATABASE_NAME` | Yes | literal `env:` → `ticket-hub-db` | Database name |
| `JWT_SECRET` | Yes | `secretRef: ticket-hub-api-credentials` | Secret used to sign/verify login JWTs (1h expiry) |
| `PORT` | Yes | literal `env:` → `3000` | HTTP port the Nest app listens on |
| `LOG_LEVEL` | Yes | literal `env:` → `info` | Minimum pino log level (`trace`/`debug`/`info`/`warn`/`error`/`fatal`) |

`ticket-hub-api-credentials` does not exist yet — creating it in-cluster is
one of the manual setup steps for the `infra-hub` deploy pipeline (see
`infra-hub/apps/ticket-hub-api/`).

## Manual verification (once deployed in-cluster)

Kubernetes Deployment/Service manifests for this app live in the separate
`infra-hub` repo, under `apps/ticket-hub-api/` (change `infra-hub-cicd`) —
not in this repo. This app's CI (`.github/workflows/release-ticket-hub-api.yml`)
builds and pushes the image, creates its git tag, and dispatches a deploy
event; it never touches Kubernetes directly. All automated tests here run
against a mocked repository (`getRepositoryToken(User)` / a fake
`UsersRepository`), never a real Postgres, by design (see "Environment
variables" above). The checklist below cannot run today; it needs
`infra-hub`'s deploy pipeline to have actually applied those manifests and
the `ticket-hub-api-credentials` Secret to exist in-cluster first — it is
written so that first real deploy can confirm the DB round trip without
re-deriving these steps from the spec/design.

`.github/workflows/release-ticket-hub-api.yml` is a manually-triggered
(`workflow_dispatch`-only) workflow: you name the previous stable tag and
the new tag to release, and it validates both, builds and publishes the
image, creates the git tag, dispatches the deploy (behind a `production`
environment approval), and then deletes every other Docker Hub tag for
this image, keeping only those two. It needs `secrets.DOCKERHUB_TOKEN` to
have delete scope, not just push/read — see the comment at the top of that
workflow file for how to regenerate it.

### 1. Confirm the Pods are up

```bash
microk8s kubectl get pods -n ticket-hub
microk8s kubectl logs -n ticket-hub deployment/ticket-hub-api
```

Both `ticket-hub-db-...` and `ticket-hub-api-...` should show `Running`. The
API log should show Nest's normal route map at boot (`Mapped {/users, POST}`,
`Mapped {/auth/login, POST}`) with no `Missing required environment
variable(s)` error — if that error appears, the Deployment/Secret wiring is
missing one of the 8 vars in the table above.

### 2. Exercise `POST /users` and `POST /auth/login` directly against the API

Port-forward the API Service to the workstation (or `kubectl exec` into any
Pod in the namespace and `curl` the in-cluster DNS name directly — either
works):

```bash
microk8s kubectl port-forward -n ticket-hub svc/ticket-hub-api 3000:3000
```

In a second shell:

```bash
curl -i -X POST http://localhost:3000/users \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ana","lastname":"Perez","email":"smoke-test@example.com","password":"secret1"}'
```

Expected: `201 Created`, JSON body `{"msg":"User created successfully","data":{"id":<number>,"name":"Ana","lastname":"Perez","email":"smoke-test@example.com"}}` — **no `password` key present**.

```bash
curl -i -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"smoke-test@example.com","password":"secret1"}'
```

Expected: `200 OK`, JSON body `{"access_token":"<jwt>"}`. Decode the payload
(e.g. `echo '<jwt-payload-part>' | base64 -d`) and confirm `exp - iat ==
3600` (1 hour).

```bash
curl -i -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"smoke-test@example.com","password":"wrong-password"}'
```

Expected: `401 Unauthorized`, `{"message":"Invalid credentials"}` — same
message as an unknown email, confirmed by repeating with a nonexistent
email.

### 3. Confirm the schema was not touched

```bash
microk8s kubectl exec -it -n ticket-hub deployment/ticket-hub-db -- \
  psql -U "$POSTGRES_USER" -d ticket-hub-db -c '\d users'
```

Compare column-by-column against the baseline in
`pcbox-api/documentation/pcbox.bootstrap.md` §8.4 (`id`, `name VARCHAR(15)`,
`lastname VARCHAR(15)`, `email VARCHAR(30) UNIQUE`, `password VARCHAR(100)`).
It must be byte-for-byte the same before and after step 2 — `synchronize:
false` means the app must never alter this table.

```bash
microk8s kubectl exec -it -n ticket-hub deployment/ticket-hub-db -- \
  psql -U "$POSTGRES_USER" -d ticket-hub-db -c "SELECT id,name,lastname,email FROM users WHERE email='smoke-test@example.com';"
```

Expected: exactly one row with a bcrypt-looking hash in `password` (not
shown in this `SELECT`, but confirm separately with `SELECT password FROM
users WHERE email='smoke-test@example.com';` that it starts with `$2b$` and
is not the plaintext `secret1`).

Clean up the test row once done:

```bash
microk8s kubectl exec -it -n ticket-hub deployment/ticket-hub-db -- \
  psql -U "$POSTGRES_USER" -d ticket-hub-db -c "DELETE FROM users WHERE email='smoke-test@example.com';"
```

### 4. Confirm the browser-facing cookie flow through `ticket-hub`

This exercises `ticket-hub`'s `app/api/login/route.ts`, which is the only
place `ticket-hub-token` is ever set (the API itself never sets cookies —
see design's Data Flow / Decision 1). Port-forward the `ticket-hub` Service
instead of the API:

```bash
microk8s kubectl port-forward -n ticket-hub svc/ticket-hub 3001:3000
```

```bash
curl -i -X POST http://localhost:3001/api/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"smoke-test@example.com","password":"secret1"}' \
  -c /tmp/ticket-hub-cookies.txt
```

Expected in the response headers: `Set-Cookie: ticket-hub-token=...;
Path=/; Max-Age=3600; HttpOnly; SameSite=Lax` (plus `Secure` once
`TICKET_HUB_COOKIE_SECURE=true` is set — confirm it is **absent** if that
var is still unset/false, since `Secure` over plain HTTP would silently
drop the cookie in a real browser). Body must be `{"ok":true}` — the raw
JWT must **not** appear anywhere in the response body.

```bash
curl -i -X POST http://localhost:3001/api/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"smoke-test@example.com","password":"wrong-password"}'
```

Expected: `401`, `{"message":"Invalid credentials"}`, and **no** `Set-Cookie`
header at all.

Finally, open `/login` in an actual browser through whatever exposes
`ticket-hub` (Ingress/Tailscale — see design's Open Questions), submit valid
credentials, and confirm in devtools → Application → Cookies that
`ticket-hub-token` is listed with `HttpOnly` checked and is **not** visible
via `document.cookie` in the console; confirm the page navigates to `/home`.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
