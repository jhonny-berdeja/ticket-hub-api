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
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { ResponseBody } from '../../common/dto/response-body.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { TicketsService } from './tickets.service';
import { ApproveTicketService } from './approve-ticket.service';
import { TicketResponse } from './ticket-response';

/**
 * No class-level @Roles() here: every route needs a different rule (or
 * none), so each one declares its own. Authentication (JwtAuthGuard) is
 * still global regardless.
 */
@Controller('tickets')
export class TicketsController {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly approveTicketService: ApproveTicketService,
  ) {}

  /**
   * No @Roles() restriction: any authenticated ticket-hub user can
   * create a ticket now — DEV/APPROVER retired along with the local
   * roles table, only ADMIN is a meaningful distinction today (used
   * below to gate approval, not creation). `user.email` becomes
   * `TicketEntity.informer`, captured now since there's no local
   * `users` table left to resolve `creator` to a name from later.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateTicketDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ResponseBody<TicketResponse>> {
    return this.ticketsService.create(dto, user.sub, user.email);
  }

  /**
   * No @Roles() restriction: the service branches on the caller's role
   * to decide *which* tickets to return (own vs. all), not whether to
   * allow the call at all.
   */
  @Get()
  findMineOrAll(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ResponseBody<TicketResponse[]>> {
    return this.ticketsService.findMineOrAll(user);
  }

  /** Powers the header search bar. Same no-@Roles() reasoning as findMineOrAll - visibility is enforced inside the service, not the guard. */
  @Get('by-number/:number')
  findByNumber(
    @Param('number', ParseIntPipe) number: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ResponseBody<TicketResponse>> {
    return this.ticketsService.findByNumber(number, user);
  }

  /** Only ADMIN can approve now (APPROVER retired) - may approve any ticket, no ownership/assignee check. */
  @Patch(':id/approve')
  @Roles(Role.ADMIN)
  approve(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseBody<TicketResponse>> {
    return this.approveTicketService.approve(id);
  }
}
