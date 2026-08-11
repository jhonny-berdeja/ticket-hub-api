import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

/**
 * `UsersRepository` is not declared here: it is provided by the `@Global()`
 * `DatabaseModule` (see `shared/database/database.module.ts`) and injected
 * automatically once that module is imported in `AppModule`.
 */
@Module({
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
