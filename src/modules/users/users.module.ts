import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UpdateUserService } from './update-user.service';

/**
 * `UsersRepository` is not declared here: it is provided by the `@Global()`
 * `DatabaseModule` (see `shared/database/database.module.ts`) and injected
 * automatically once that module is imported in `AppModule`.
 *
 * `AuthModule` is imported so `UsersService` can reuse `AuthService.hashPassword()`
 * — see the dependency-direction note in `auth.module.ts`.
 */
@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [UsersService, UpdateUserService],
})
export class UsersModule {}
