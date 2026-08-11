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
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { Role } from '../../common/database/role/role.enum';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
import { UserWithRoles } from './user-with-roles';

/**
 * Every route here requires an authenticated ADMIN (JwtAuthGuard runs
 * first to populate request.user, RolesGuard then checks it) - confirmed
 * product decision. The very first ADMIN can't come from this endpoint
 * (chicken-and-egg): it's assigned directly in the database once, by hand.
 */
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
    return this.usersService.update(id, dto);
  }
}
