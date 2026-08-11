import { Role } from '../../common/database/role/role.enum';

/** Response shape for every users endpoint — password never appears here, roles always do. */
export interface UserWithRoles {
  id: number;
  name: string;
  lastname: string;
  email: string;
  roles: Role[];
}
