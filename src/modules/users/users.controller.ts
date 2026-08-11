import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { UserEntity } from '../../common/database/user/user.entity';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

/** Public — no auth guard on purpose (confirmed proposal decision). */
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateUserDto,
  ): Promise<ResponseBody<Omit<UserEntity, 'password'>>> {
    return this.usersService.create(dto);
  }
}
