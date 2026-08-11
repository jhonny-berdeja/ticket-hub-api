/**
 * Deliberately narrower than UserWithRoles: no roles, no anything a DEV
 * doesn't need to pick an assignee. GET /users/approvers is reachable by
 * any authenticated user (including DEV, who is not ADMIN), so it must
 * never expose more than this.
 */
export interface AssignableUser {
  id: number;
  name: string;
  lastname: string;
  email: string;
}
