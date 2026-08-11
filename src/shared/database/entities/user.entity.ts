import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Maps the existing `users` table only. The schema is an immutable
 * baseline created once by the `ticket-hub-db-init` ConfigMap — this
 * entity must never assume columns beyond the ones already present
 * (no `created_at`/`updated_at`).
 */
@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 15 })
  name: string;

  @Column({ length: 15 })
  lastname: string;

  @Column({ length: 30, unique: true })
  email: string;

  @Column({ length: 100 })
  password: string;
}
