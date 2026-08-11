import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from './role.enum';

/**
 * Maps the existing `roles` table only (immutable baseline, same rule as
 * `UserEntity` — no `synchronize`, no assumed columns beyond what the
 * `ticket-hub-db-init` ConfigMap already created). One row per role
 * assignment: a user with N roles has N rows here, all sharing `idUser`.
 * There is no ORM-level relation/FK object to `UserEntity` on purpose —
 * `idUser` stays a plain column, looked up explicitly by
 * `RolesRepository`, mirroring how `UsersRepository` has no relation
 * back to `roles` either.
 */
@Entity({ name: 'roles' })
export class RoleEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'id_user' })
  idUser!: number;

  // `type: 'varchar'` is explicit on purpose: TypeORM infers the column
  // type from TS reflection metadata when omitted, and a TS enum
  // reflects as generic `Object`, not a primitive - `better-sqlite3`
  // (used by the e2e in-memory DB) rejects that outright with
  // "Data type Object ... is not supported". `varchar` also matches the
  // real Postgres column (`rol VARCHAR(15)`) exactly.
  @Column({ name: 'rol', type: 'varchar', length: 15 })
  rol!: Role;

  static builder(): RoleEntityBuilder {
    return new RoleEntityBuilder();
  }
}

/** Fluent builder for `RoleEntity` — mirrors `UserEntityBuilder`'s pattern. */
export class RoleEntityBuilder {
  private idUser?: number;
  private rol?: Role;

  withIdUser(idUser: number): this {
    this.idUser = idUser;
    return this;
  }

  withRol(rol: Role): this {
    this.rol = rol;
    return this;
  }

  build(): RoleEntity {
    if (this.idUser === undefined) {
      throw new Error('RoleEntity.Builder: idUser is required');
    }
    if (this.rol === undefined) {
      throw new Error('RoleEntity.Builder: rol is required');
    }

    const entity = new RoleEntity();
    entity.idUser = this.idUser;
    entity.rol = this.rol;
    return entity;
  }
}
