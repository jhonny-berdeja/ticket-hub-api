/**
 * The three roles the business defines. Values are the exact strings
 * stored in `roles.rol` (VARCHAR(15)) — all fit comfortably under that
 * limit ("APPROVER" is the longest, at 8 chars).
 */
export enum Role {
  ADMIN = 'ADMIN',
  DEV = 'DEV',
  APPROVER = 'APPROVER',
}

export const ALL_ROLES: readonly Role[] = [Role.ADMIN, Role.DEV, Role.APPROVER];
