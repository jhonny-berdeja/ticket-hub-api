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
import { CreateAnsibleTicketDto } from './dto/create-ansible-ticket.dto';
import { CreateDatabaseTicketDto } from './dto/create-database-ticket.dto';
import { TicketsService } from './tickets.service';
import { ApproveTicketService } from './approve-ticket.service';
import { TicketResponse } from './ticket-response';
import { PcboxApiService } from '../pcbox-api/pcbox-api.service';
import { DbTarget } from '../pcbox-api/pcbox-api.connector';
import { IamApiService } from '../iam-api/iam-api.service';
import { InternalUser } from '../iam-api/iam-api.connector';

@Controller('tickets')
export class TicketsController {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly approveTicketService: ApproveTicketService,
    private readonly pcboxApiService: PcboxApiService,
    private readonly iamApiService: IamApiService,
  ) {}

  @Post('ansible')
  @HttpCode(HttpStatus.CREATED)
  createAnsible(
    @Body() dto: CreateAnsibleTicketDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ResponseBody<TicketResponse>> {
    return this.ticketsService.createAnsible(dto, user.email);
  }

  @Post('database')
  @HttpCode(HttpStatus.CREATED)
  createDatabase(
    @Body() dto: CreateDatabaseTicketDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ResponseBody<TicketResponse>> {
    return this.ticketsService.createDatabase(dto, user.email);
  }

  @Get()
  findMineOrAll(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ResponseBody<TicketResponse[]>> {
    return this.ticketsService.findMineOrAll(user);
  }

  @Get('by-number/:number')
  findByNumber(
    @Param('number', ParseIntPipe) number: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ResponseBody<TicketResponse>> {
    return this.ticketsService.findByNumber(number, user);
  }

  /** Proxies pcbox-api's allowlist so the create-ticket form's dropdown never hardcodes it — see design's "anti-drift" note. */
  @Get('db-targets')
  async getDbTargets(): Promise<ResponseBody<DbTarget[]>> {
    const targets = await this.pcboxApiService.fetchDbTargets();
    return ResponseBody.builder<DbTarget[]>()
      .withMsg('Allowlisted database targets retrieved successfully')
      .withData(targets)
      .build();
  }

  /**
   * Ticket-hub's assignee dropdown: internal users with role ADMIN on the
   * ticket-hub application in iam-api. Normal JWT auth only — ticket
   * creation/assignment isn't role-restricted in this repo today, same as
   * `POST /tickets/ansible`/`POST /tickets/database`.
   */
  @Get('assignable-users')
  async getAssignableUsers(): Promise<ResponseBody<InternalUser[]>> {
    const users = await this.iamApiService.fetchAssignableUsers();
    return ResponseBody.builder<InternalUser[]>()
      .withMsg('Assignable users retrieved successfully')
      .withData(users)
      .build();
  }

  @Patch(':id/approve')
  @Roles(Role.ADMIN)
  approve(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseBody<TicketResponse>> {
    return this.approveTicketService.approve(id);
  }
}
