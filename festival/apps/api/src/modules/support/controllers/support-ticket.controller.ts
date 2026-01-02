import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { SupportTicketService } from '../services/support-ticket.service';
import {
  CreateSupportTicketDto,
  UpdateSupportTicketDto,
  CreateSupportMessageDto,
  ChangeTicketStatusDto,
  AssignTicketDto,
  SupportTicketQueryDto,
  SupportTicketResponseDto,
  SupportMessageResponseDto,
  TicketStatisticsDto,
  SlaConfigDto,
} from '../dto/support-ticket.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

@ApiTags('Support Tickets')
@ApiBearerAuth()
@Controller('support/tickets')
export class SupportTicketController {
  constructor(private readonly supportTicketService: SupportTicketService) {}

  // ===== User Endpoints =====

  @Post()
  @ApiOperation({ summary: 'Create a new support ticket' })
  @ApiResponse({
    status: 201,
    description: 'Ticket created successfully',
    type: SupportTicketResponseDto,
  })
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateSupportTicketDto,
  ): Promise<SupportTicketResponseDto> {
    return this.supportTicketService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get my support tickets' })
  @ApiResponse({
    status: 200,
    description: 'Tickets retrieved successfully',
  })
  async findMyTickets(
    @CurrentUser() user: AuthUser,
    @Query() query: SupportTicketQueryDto,
  ): Promise<{ tickets: SupportTicketResponseDto[]; total: number }> {
    const isStaff = this.isStaffRole(user.role);
    return this.supportTicketService.findAll(query, user.id, isStaff);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a support ticket by ID' })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  @ApiResponse({
    status: 200,
    description: 'Ticket retrieved successfully',
    type: SupportTicketResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findById(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SupportTicketResponseDto> {
    const isStaff = this.isStaffRole(user.role);
    return this.supportTicketService.findById(id, user.id, isStaff);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Add a message to a support ticket' })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  @ApiResponse({
    status: 201,
    description: 'Message added successfully',
    type: SupportMessageResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async addMessage(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) ticketId: string,
    @Body() dto: CreateSupportMessageDto,
  ): Promise<SupportMessageResponseDto> {
    const isStaff = this.isStaffRole(user.role);
    return this.supportTicketService.addMessage(
      ticketId,
      user.id,
      dto,
      isStaff,
    );
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Get all messages for a support ticket' })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  @ApiResponse({
    status: 200,
    description: 'Messages retrieved successfully',
    type: [SupportMessageResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getMessages(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) ticketId: string,
  ): Promise<SupportMessageResponseDto[]> {
    const isStaff = this.isStaffRole(user.role);
    return this.supportTicketService.getMessages(ticketId, user.id, isStaff);
  }

  // ===== Staff/Admin Endpoints =====

  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.STAFF)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a support ticket (staff only)' })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  @ApiResponse({
    status: 200,
    description: 'Ticket updated successfully',
    type: SupportTicketResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSupportTicketDto,
  ): Promise<SupportTicketResponseDto> {
    return this.supportTicketService.update(id, dto, user.id);
  }

  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.STAFF)
  @Patch(':id/status')
  @ApiOperation({ summary: 'Change ticket status (staff only)' })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  @ApiResponse({
    status: 200,
    description: 'Status changed successfully',
    type: SupportTicketResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  async changeStatus(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeTicketStatusDto,
  ): Promise<SupportTicketResponseDto> {
    return this.supportTicketService.changeStatus(id, dto, user.id);
  }

  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.STAFF)
  @Patch(':id/assign')
  @ApiOperation({ summary: 'Assign ticket to staff member' })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  @ApiResponse({
    status: 200,
    description: 'Ticket assigned successfully',
    type: SupportTicketResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Ticket or staff not found' })
  async assign(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignTicketDto,
  ): Promise<SupportTicketResponseDto> {
    return this.supportTicketService.assign(id, dto.staffId, user.id);
  }

  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.STAFF)
  @Get('admin/all')
  @ApiOperation({ summary: 'Get all tickets (staff only)' })
  @ApiResponse({
    status: 200,
    description: 'Tickets retrieved successfully',
  })
  async findAllTickets(
    @Query() query: SupportTicketQueryDto,
  ): Promise<{ tickets: SupportTicketResponseDto[]; total: number }> {
    return this.supportTicketService.findAll(query, undefined, true);
  }

  @Roles(UserRole.ADMIN, UserRole.ORGANIZER, UserRole.STAFF)
  @Get('admin/sla-breaches')
  @ApiOperation({ summary: 'Get tickets that have breached SLA' })
  @ApiResponse({
    status: 200,
    description: 'SLA breaching tickets retrieved',
    type: [SupportTicketResponseDto],
  })
  async getSlaBreaches(): Promise<SupportTicketResponseDto[]> {
    return this.supportTicketService.getSlaBreachers();
  }

  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  @Get('admin/statistics')
  @ApiOperation({ summary: 'Get ticket statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    type: TicketStatisticsDto,
  })
  async getStatistics(
    @Query('festivalId') festivalId?: string,
  ): Promise<TicketStatisticsDto> {
    return this.supportTicketService.getStatistics(festivalId);
  }

  @Roles(UserRole.ADMIN)
  @Put('admin/sla-config')
  @ApiOperation({ summary: 'Update SLA configuration' })
  @ApiResponse({
    status: 200,
    description: 'SLA configuration updated',
  })
  async updateSlaConfig(@Body() config: SlaConfigDto): Promise<{ success: boolean }> {
    this.supportTicketService.updateSlaConfig(config);
    return { success: true };
  }

  // ===== Helpers =====

  private isStaffRole(role: UserRole): boolean {
    return ([UserRole.ADMIN, UserRole.ORGANIZER, UserRole.STAFF] as UserRole[]).includes(role);
  }
}
