import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Roles } from '../auth/guards/roles.decorator';
import { Role } from '../../common/database/role/role.enum';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
import { UpdateUserService } from './update-user.service';
import { UserWithRoles } from './user-with-roles';

/**
 * Every route here requires an authenticated ADMIN. Authentication comes
 * from the global JwtAuthGuard (populates request.user on every request
 * by default); @Roles(Role.ADMIN) is read by the equally-global
 * RolesGuard, which only enforces a check when a route declares one -
 * this is the only controller that does. The very first ADMIN can't come
 * from this endpoint (chicken-and-egg): it's assigned directly in the
 * database once, by hand.
 */
@Controller('users')
@Roles(Role.ADMIN)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly updateUserService: UpdateUserService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateUserDto): Promise<ResponseBody<UserWithRoles>> {
    return this.usersService.create(dto);
  }

  @Get()
  findAll(): Promise<ResponseBody<UserWithRoles[]>> {
    return this.usersService.findAll();
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ): Promise<ResponseBody<UserWithRoles>> {
    return this.updateUserService.update(id, dto);
  }
}
