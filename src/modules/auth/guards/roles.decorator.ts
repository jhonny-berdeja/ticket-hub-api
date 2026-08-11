import { SetMetadata } from '@nestjs/common';
import { Role } from '../../../common/database/role/role.enum';

export const ROLES_KEY = 'roles';

/** Marks a handler/controller as requiring at least one of the given roles. Paired with `RolesGuard`. */
export const Roles = (...roles: Role[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
