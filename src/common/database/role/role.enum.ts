/**
 * Only ADMIN is checked anywhere anymore -- DEV/APPROVER retired along
 * with the local users/roles tables (see AppModule/DatabaseModule
 * history): ticket-hub authenticates against auth-api now, and only
 * ADMIN is meaningful there today. Values are exact strings compared
 * against `RolePayload.name` on the auth-api-issued token (see
 * RolesGuard).
 */
export enum Role {
  ADMIN = 'ADMIN',
}
