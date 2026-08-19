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
import { PcboxApiService } from '../pcbox-api/pcbox-api.service';
import { DbTarget } from '../pcbox-api/pcbox-api.connector';

@Controller('tickets')
export class TicketsController {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly approveTicketService: ApproveTicketService,
    private readonly pcboxApiService: PcboxApiService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateTicketDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ResponseBody<TicketResponse>> {
    return this.ticketsService.create(dto, user.sub, user.email);
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

  @Patch(':id/approve')
  @Roles(Role.ADMIN)
  approve(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseBody<TicketResponse>> {
    return this.approveTicketService.approve(id);
  }
}
