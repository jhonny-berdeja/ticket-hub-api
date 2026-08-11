# ticket-hub-api — convenciones de estructura

## Organización de carpetas

- `src/common/` — infraestructura transversal, nunca específica de una
  funcionalidad:
  - `config/` — validación de variables de entorno (`env.validation.ts`)
    + el `EnvModule` global.
  - `database/<entidad>/` — una carpeta por entidad raíz, con su entity de
    TypeORM **y** su repository juntos. No separar por tipo de artefacto
    (`entities/`, `repositories/`) — todo lo referido a una entidad vive
    en una sola carpeta.
  - `dto/` — solo formas de respuesta genéricas y reutilizables (p. ej.
    `ResponseBody<T>`). Los DTOs específicos de una funcionalidad NO van
    acá — ver más abajo.
- `src/modules/<funcionalidad>/` — una carpeta por funcionalidad de
  negocio (`auth`, `users`, ...). Cada una tiene:
  - `<funcionalidad>.module.ts`, `<funcionalidad>.controller.ts`,
    `<funcionalidad>.service.ts`
  - `dto/` — DTOs específicos del contrato HTTP de esa funcionalidad:
    tanto de request (`CreateUserDto`) como de response (`ResponseLogin`).
  - mappers (`<entidad>.mapper.ts`) y value objects internos que nunca
    cruzan el límite HTTP tal cual (`payload-jwt.ts`) van sueltos en la
    raíz del módulo, no dentro de `dto/`.
- `test/` espeja a `src/`:
  - `test/common/` — infraestructura de test compartida (módulo de DB en
    memoria, helper de bootstrap de la app). Nada específico de una
    funcionalidad va acá.
  - `test/modules/<funcionalidad>/` — los e2e specs de esa funcionalidad.

## Reglas de dependencia entre módulos

- `@Global()` se reserva para los módulos que toda la app necesita de
  forma implícita (`EnvModule`, `DatabaseModule`). Siempre documentar, en
  un comentario sobre el módulo, *por qué* es global y *por qué* sus
  consumidores no lo importan explícitamente.
- Los módulos de funcionalidad pueden depender entre sí en una sola
  dirección, nunca de forma circular. Documentar la dirección y el motivo
  en un comentario de ambos lados (ver `auth.module.ts` /
  `users.module.ts`).

## Patrón builder

Toda clase con 2 o más campos obligatorios que represente un valor
construido —entities, DTOs transversales, value objects internos— lleva
un builder: un `.builder()` estático que devuelve una clase builder con
campos privados, setters fluidos `withX()`, y un `build()` que lanza error
si falta algún campo obligatorio. Forma de referencia: `UserEntity`,
`ResponseBody`, `PayloadJwt`.

- Si el valor construido termina en manos de algo que verifica en runtime
  que sea un objeto plano (p. ej. `jsonwebtoken.sign()`, que rechaza
  instancias de clase vía `lodash.isPlainObject`), `build()` debe devolver
  un objeto literal plano, no `new NombreClase()` — ver
  `PayloadJwtBuilder.build()` para el porqué y el cómo.

## Variables de entorno

`src/common/config/env.validation.ts` es la única fuente de verdad para
las variables de entorno requeridas (todas obligatorias, validadas con
`class-validator`). Cualquier variable que se agregue, quite o renombre
ahí debe reflejarse tanto en `.env.example` como en la tabla del
`README.md` — las tres nunca deben desincronizarse.
