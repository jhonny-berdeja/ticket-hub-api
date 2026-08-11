import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Maps the existing `users` table only. The schema is an immutable
 * baseline created once by the `ticket-hub-db-init` ConfigMap — this
 * entity must never assume columns beyond the ones already present
 * (no `created_at`/`updated_at`).
 */
@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 15 })
  name!: string;

  @Column({ length: 15 })
  lastname!: string;

  @Column({ length: 30, unique: true })
  email!: string;

  @Column({ length: 100 })
  password!: string;

  /** `id` is intentionally not settable here — it's DB-generated, never caller-supplied. */
  static builder(): UserEntityBuilder {
    return new UserEntityBuilder();
  }
}

/** Fluent builder for `UserEntity` — mirrors `ResponseBodyBuilder`/`PayloadJwtBuilder`'s pattern. */
export class UserEntityBuilder {
  private name?: string;
  private lastname?: string;
  private email?: string;
  private password?: string;

  withName(name: string): this {
    this.name = name;
    return this;
  }

  withLastname(lastname: string): this {
    this.lastname = lastname;
    return this;
  }

  withEmail(email: string): this {
    this.email = email;
    return this;
  }

  withPassword(password: string): this {
    this.password = password;
    return this;
  }

  build(): UserEntity {
    if (this.name === undefined) {
      throw new Error('UserEntity.Builder: name is required');
    }
    if (this.lastname === undefined) {
      throw new Error('UserEntity.Builder: lastname is required');
    }
    if (this.email === undefined) {
      throw new Error('UserEntity.Builder: email is required');
    }
    if (this.password === undefined) {
      throw new Error('UserEntity.Builder: password is required');
    }

    const entity = new UserEntity();
    entity.name = this.name;
    entity.lastname = this.lastname;
    entity.email = this.email;
    entity.password = this.password;
    return entity;
  }
}
