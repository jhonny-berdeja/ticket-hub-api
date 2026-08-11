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
import { CurrentUser } from '../auth/guards/current-user.decorator';
import { PayloadJwt } from '../auth/payload-jwt';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { TicketsService } from './tickets.service';
import { ApproveTicketService } from './approve-ticket.service';
import { TicketResponse } from './ticket-response';

/**
 * No class-level @Roles() here, unlike UsersController: every route
 * needs a different rule, so each one declares its own. Authentication
 * (JwtAuthGuard) is still global regardless.
 */
@Controller('tickets')
export class TicketsController {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly approveTicketService: ApproveTicketService,
  ) {}

  /** Only a DEV can create a ticket - confirmed product decision, APPROVER/ADMIN are excluded on purpose. */
  @Post()
  @Roles(Role.DEV)
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateTicketDto,
    @CurrentUser() user: PayloadJwt,
  ): Promise<ResponseBody<TicketResponse>> {
    return this.ticketsService.create(dto, user.sub);
  }

  /**
   * No @Roles() restriction: every role (DEV/APPROVER/ADMIN) can call
   * this, since there are only three roles and all three have some form
   * of access — the service branches on the caller's role to decide
   * *which* tickets to return (own vs. all), not whether to allow the
   * call at all.
   */
  @Get()
  findMineOrAll(
    @CurrentUser() user: PayloadJwt,
  ): Promise<ResponseBody<TicketResponse[]>> {
    return this.ticketsService.findMineOrAll(user);
  }

  /** Powers the header search bar. Same no-@Roles() reasoning as findMineOrAll - visibility is enforced inside the service, not the guard. */
  @Get('by-number/:number')
  findByNumber(
    @Param('number', ParseIntPipe) number: number,
    @CurrentUser() user: PayloadJwt,
  ): Promise<ResponseBody<TicketResponse>> {
    return this.ticketsService.findByNumber(number, user);
  }

  /** Only APPROVER/ADMIN can approve - either one may approve any ticket, no ownership/assignee check. */
  @Patch(':id/approve')
  @Roles(Role.APPROVER, Role.ADMIN)
  approve(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseBody<TicketResponse>> {
    return this.approveTicketService.approve(id);
  }
}
