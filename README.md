# ticket-hub-api

## ¿Para qué es este proyecto?

`ticket-hub-api` es el backend de la ticketera `ticket-hub`. Expone una API
REST para crear, consultar y aprobar tickets de soporte, valida la identidad
de cada request contra `auth-api` mediante JWT (RS256) y, al aprobar un
ticket, notifica a `pcbox-api` para que ejecute la administración asociada.
Corre únicamente como Pod en el namespace `ticket-hub` del clúster microk8s
del ecosistema (host `pcbox`): no existe un entorno de desarrollo local, ni
docker-compose de Postgres, ni archivo `.env` — todos los valores de
configuración llegan como variables de entorno inyectadas por el Deployment,
y la app falla al arrancar si falta alguna (`ConfigModule.forRoot({
ignoreEnvFile: true, validate })`, ver `src/common/config/env.validation.ts`).

## ¿Qué hace cada módulo?

### `auth`

Delegado casi por completo a `auth-api`: este módulo no emite ni firma
tokens propios. `JwksClientService` sondea `AUTH_API_URL` cada 5 minutos
para refrescar las claves públicas (JWKS) de `auth-api`; `JwtAuthGuard` usa
esas claves para verificar el bearer token de cada request (algoritmo
RS256), deja pasar los endpoints marcados con `@Public()` y adjunta el
usuario decodificado a `request.user`. `RolesGuard` reutiliza los roles
incluidos en ese payload para restringir endpoints marcados con
`@Roles(...)`. El único endpoint propio es `GET /auth/me`, que devuelve el
usuario autenticado actual (`AuthController`).

### `tickets`

Contiene la lógica de negocio de los tickets: `TicketsController` expone
`POST /tickets` (creación), `GET /tickets` (lista los propios, o todos si el
usuario es admin), `GET /tickets/by-number/:number` y `PATCH
/tickets/:id/approve` (solo rol `ADMIN`). `TicketsService` arma el ticket con
un número secuencial y resuelve las consultas respetando quién puede ver
qué. `ApproveTicketService` orquesta la aprobación: marca el ticket como
`APPROVED`, delega en `pcbox-api` (módulo `pcbox-api`) para ejecutar la
administración correspondiente y guarda el resultado de esa llamada como la
`response` del ticket.

### `pcbox-api`

Encapsula la integración con el servicio externo `pcbox-api`.
`PcboxApiConnector` primero se autentica contra `auth-api` (`POST
/apps-users/login`, con las credenciales `PCBOX_API_CLIENT_ID` /
`PCBOX_API_CLIENT_SECRET` y el header `X-Application-Name`) y, con el token
obtenido, llama a `POST /pcbox` en `pcbox-api` para crear la
"administración" que ejecuta el código Ansible del ticket. `PcboxApiService`
arma el cuerpo de esa llamada a partir del ticket, y traduce tanto una
respuesta exitosa (incluyendo `stdout`/`stderr` de la ejecución) como los
errores o la falta de asignado en un texto legible que queda guardado en el
ticket.

## ¿Qué variables de entorno necesito?

### Variables para el pipeline de GitHub Actions

El único workflow del repo es `.github/workflows/release-ticket-hub-api.yml`.
La guía paso a paso para obtener cada valor está en
`.github/workflows/obtain-secrets.md`; acá va el resumen:

- **`DOCKERHUB_USERNAME` y `DOCKERHUB_TOKEN`**: identifican la cuenta/organización
  de Docker Hub donde se publica la imagen `ticket-hub-api`. `DOCKERHUB_USERNAME`
  es el username (o nombre de organización) de esa cuenta; `DOCKERHUB_TOKEN` es
  un Access Token generado desde Docker Hub → Account Settings → Security, y
  necesita permisos **Read, Write y Delete** (no alcanza con "Read & Write"),
  porque además de loguear y publicar la imagen, el job `cleanup-tags` lo usa
  para borrar los tags viejos después de cada release.
- **`INFRA_HUB_DISPATCH_TOKEN`**: personal access token (fine-grained) de
  GitHub, con permisos `Actions: Read and write` y `Contents: Read-only`
  sobre el repositorio `infra-hub`. Lo usan `dispatch-infra-hub-deploy.sh` y
  `wait-for-infra-hub-deploy.sh` para disparar el workflow de deploy en
  `infra-hub` y luego consultar el estado de esa corrida. Se guarda como
  secreto en **este** repositorio (`ticket-hub-api`), no en `infra-hub`.

### Variables para el funcionamiento de la app

Todas son obligatorias en runtime (`src/common/config/env.validation.ts`
valida esto al bootear y la app no arranca si falta alguna):

- **`POSTGRES_USER` y `POSTGRES_PASSWORD`**: credenciales del rol de Postgres
  usado para conectarse a `ticket-hub-db`; en el clúster llegan desde el
  Secret `ticket-hub-db-credentials`.
- **`DATABASE_HOST`, `DATABASE_PORT` y `DATABASE_NAME`**: ubicación de la base
  de datos. En el clúster son valores literales: el nombre DNS del Service de
  Postgres (`ticket-hub-db.ticket-hub.svc.cluster.local`), el puerto `5432`
  y el nombre de base `ticket-hub-db`.
- **`AUTH_API_URL`**: URL base de `auth-api` (DNS interno del clúster). La
  usan tanto `JwksClientService` (para refrescar las claves JWKS cada 5
  minutos) como `PcboxApiConnector` (para loguearse antes de llamar a
  `pcbox-api`).
- **`PORT`**: puerto HTTP en el que escucha la app Nest (`3000` en el
  clúster).
- **`LOG_LEVEL`**: nivel mínimo de log de pino (`trace`/`debug`/`info`/
  `warn`/`error`/`fatal`).
- **`PCBOX_API_URL`**: URL base de `pcbox-api`, contra la que se llama
  `POST /pcbox` al aprobar un ticket.
- **`PCBOX_API_APPLICATION_NAME`**: nombre de aplicación enviado como header
  `X-Application-Name` al loguearse en `auth-api` antes de llamar a
  `pcbox-api`; debe coincidir con el nombre con el que `pcbox-api` está
  registrado en la tabla `applications` de `auth-api`.
- **`PCBOX_API_CLIENT_ID` y `PCBOX_API_CLIENT_SECRET`**: credenciales de
  tipo "apps-user" con las que `PcboxApiConnector` se loguea contra
  `auth-api` (`POST /apps-users/login`) antes de llamar a `pcbox-api`.
  Reemplazan a la vieja clave compartida `PCBOX_API_ADMIN_KEY`. En el
  clúster llegan desde el Secret `pcbox-api-notification-credentials`, que
  no se crea automáticamente: es uno de los pasos manuales del pipeline de
  deploy de `infra-hub` (ver `infra-hub/apps/ticket-hub-api/` y
  `infra-hub/databases/ticket-hub-db.md`, paso 9).

## ¿Cómo se ejecuta la app?

La app se ejecuta exclusivamente como Pod en el clúster microk8s del
servidor `pcbox`; no hay un modo "correr localmente" soportado para
producción. Para desplegar una nueva versión hay que ir a GitHub Actions y
disparar manualmente (`workflow_dispatch`) el workflow
`release-ticket-hub-api.yml`, completando dos inputs:

- **`previous_stable_tag`**: el tag de la última versión estable conocida,
  la que se conserva como respaldo. El workflow valida que ese tag ya exista
  como tag de git y como tag de la imagen en Docker Hub.
- **`new_tag`**: el tag de la nueva versión a construir, publicar y
  desplegar. El workflow valida que ese tag **no** exista todavía ni como
  tag de git ni en Docker Hub.

A partir de ahí el workflow encadena varios jobs: `validate` confirma que
los secretos y ambos tags son correctos; `build-and-push` construye la
imagen Docker, la publica en Docker Hub con el `new_tag` y crea el tag de
git correspondiente; `approve-and-deploy` requiere una aprobación manual en
el ambiente de GitHub `production` y, una vez aprobado, dispara (usando
`INFRA_HUB_DISPATCH_TOKEN`) el workflow de deploy del repositorio
`infra-hub`, esperando a que esa corrida termine antes de continuar — es ese
workflow de `infra-hub` el que aplica los manifiestos de Kubernetes
(`infra-hub/apps/ticket-hub-api/`: `deployment.yaml`, `service.yaml`,
`namespace.yaml`) contra microk8s; este repositorio nunca toca Kubernetes
directamente. Por último, `cleanup-tags` borra de Docker Hub todos los tags
de la imagen `ticket-hub-api` excepto `previous_stable_tag` y `new_tag`.

Una vez desplegado, se puede confirmar que el Pod está sano con:

```bash
microk8s kubectl get pods -n ticket-hub
microk8s kubectl logs -n ticket-hub deployment/ticket-hub-api
```
