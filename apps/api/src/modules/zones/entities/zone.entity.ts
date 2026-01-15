import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Zone, TicketType, ZoneAccessLog, ZoneAccessAction } from '@prisma/client';

/**
 * Entity representing a zone with its relations
 */
export class ZoneEntity implements Zone {
  @ApiProperty({
    description: 'Unique zone identifier',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  id!: string;

  @ApiProperty({
    description: 'Festival ID this zone belongs to',
    example: 'fest-uuid-1234',
  })
  festivalId!: string;

  @ApiProperty({
    description: 'Zone name',
    example: 'VIP Lounge',
  })
  name!: string;

  @ApiPropertyOptional({
    description: 'Zone description',
    example: 'Exclusive area for VIP ticket holders',
  })
  description!: string | null;

  @ApiPropertyOptional({
    description: 'Maximum capacity',
    example: 500,
  })
  capacity!: number | null;

  @ApiProperty({
    description: 'Current number of people in the zone',
    example: 150,
  })
  currentOccupancy!: number;

  @ApiProperty({
    description: 'Ticket types required for access',
    example: ['VIP', 'BACKSTAGE'],
    isArray: true,
  })
  requiresTicketType!: TicketType[];

  @ApiProperty({
    description: 'Whether the zone is active',
    example: true,
  })
  isActive!: boolean;

  @ApiProperty({
    description: 'Creation timestamp',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Last update timestamp',
  })
  updatedAt!: Date;
}

/**
 * Extended zone entity with computed properties
 */
export class ZoneWithStatsEntity extends ZoneEntity {
  @ApiPropertyOptional({
    description: 'Occupancy percentage (0-100)',
    example: 75.5,
  })
  occupancyPercentage?: number | null;

  @ApiProperty({
    description: 'Whether the zone is at full capacity',
    example: false,
  })
  isAtCapacity!: boolean;

  @ApiProperty({
    description: 'Whether the zone is near capacity (above warning threshold)',
    example: false,
  })
  isNearCapacity!: boolean;

  @ApiPropertyOptional({
    description: 'Number of available spots',
    example: 50,
  })
  availableSpots?: number | null;

  @ApiPropertyOptional({
    description: 'Total number of entries today',
    example: 1500,
  })
  todayEntries?: number;

  @ApiPropertyOptional({
    description: 'Total number of exits today',
    example: 1350,
  })
  todayExits?: number;
}

/**
 * Entity representing a zone access log entry
 */
export class ZoneAccessLogEntity implements ZoneAccessLog {
  @ApiProperty({
    description: 'Unique log entry identifier',
    example: 'log-uuid-1234',
  })
  id!: string;

  @ApiProperty({
    description: 'Zone ID',
    example: 'zone-uuid-1234',
  })
  zoneId!: string;

  @ApiProperty({
    description: 'Ticket ID',
    example: 'ticket-uuid-1234',
  })
  ticketId!: string;

  @ApiProperty({
    description: 'Access action (ENTRY or EXIT)',
    enum: ZoneAccessAction,
    example: 'ENTRY',
  })
  action!: ZoneAccessAction;

  @ApiPropertyOptional({
    description: 'Staff ID who performed the scan',
    example: 'staff-uuid-1234',
  })
  performedById!: string | null;

  @ApiProperty({
    description: 'Timestamp of the access event',
  })
  timestamp!: Date;
}

/**
 * Entity for zone access log with ticket holder details
 */
export class ZoneAccessLogWithDetailsEntity extends ZoneAccessLogEntity {
  @ApiPropertyOptional({
    description: 'Ticket holder information',
  })
  ticketHolder?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    ticketType: string;
    ticketCategory: string;
  };

  @ApiPropertyOptional({
    description: 'Staff member who performed the action',
  })
  performedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

/**
 * Zone statistics entity
 */
export class ZoneStatsEntity {
  @ApiProperty({
    description: 'Zone information',
  })
  zone!: {
    id: string;
    name: string;
    capacity: number | null;
    currentOccupancy: number;
    isActive: boolean;
  };

  @ApiProperty({
    description: 'Access statistics',
  })
  stats!: {
    totalEntries: number;
    totalExits: number;
    uniqueVisitors: number;
    peakOccupancy: number;
    averageStayDurationMinutes: number | null;
  };

  @ApiProperty({
    description: 'Hourly distribution of entries and exits',
    isArray: true,
  })
  hourlyDistribution!: {
    hour: number;
    entries: number;
    exits: number;
  }[];

  @ApiPropertyOptional({
    description: 'Real-time capacity alerts',
  })
  alerts?: {
    type: 'WARNING' | 'CRITICAL';
    message: string;
    timestamp: Date;
  }[];
}

/**
 * Real-time zone status for dashboard
 */
export class ZoneRealTimeStatusEntity {
  @ApiProperty({
    description: 'Zone ID',
  })
  zoneId!: string;

  @ApiProperty({
    description: 'Zone name',
  })
  zoneName!: string;

  @ApiProperty({
    description: 'Current occupancy count',
  })
  currentOccupancy!: number;

  @ApiPropertyOptional({
    description: 'Maximum capacity',
  })
  capacity!: number | null;

  @ApiPropertyOptional({
    description: 'Occupancy percentage',
  })
  occupancyPercentage!: number | null;

  @ApiProperty({
    description: 'Status indicator',
    enum: ['GREEN', 'YELLOW', 'ORANGE', 'RED'],
    example: 'GREEN',
  })
  status!: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';

  @ApiProperty({
    description: 'Last entry timestamp',
  })
  lastActivity!: Date | null;

  @ApiProperty({
    description: 'Entries in the last 5 minutes',
  })
  recentEntries!: number;

  @ApiProperty({
    description: 'Exits in the last 5 minutes',
  })
  recentExits!: number;
}
