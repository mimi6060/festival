import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FestivalStatus } from '../entities/festival.entity';
import { Exclude, Expose, Type } from 'class-transformer';

/**
 * Organizer info included in festival responses
 */
export class OrganizerInfoDto {
  @ApiProperty({
    description: 'Organizer user ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  id: string;

  @ApiProperty({
    description: 'Organizer first name',
    example: 'Jean',
  })
  firstName: string;

  @ApiProperty({
    description: 'Organizer last name',
    example: 'Dupont',
  })
  lastName: string;

  @ApiPropertyOptional({
    description: 'Organizer email (only visible to admins/owner)',
    example: 'jean.dupont@example.com',
  })
  email?: string;
}

/**
 * Festival response DTO for API responses
 */
export class FestivalResponseDto {
  @ApiProperty({
    description: 'Unique identifier (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Festival name',
    example: 'Rock en Seine 2025',
  })
  name: string;

  @ApiProperty({
    description: 'URL-friendly unique slug',
    example: 'rock-en-seine-2025',
  })
  slug: string;

  @ApiPropertyOptional({
    description: 'Festival description',
    example: 'Le plus grand festival rock de la region parisienne',
  })
  description?: string;

  @ApiProperty({
    description: 'Festival location/venue name',
    example: 'Domaine national de Saint-Cloud',
  })
  location: string;

  @ApiPropertyOptional({
    description: 'Full address',
    example: '1 Avenue de la Grille d\'Honneur, 92210 Saint-Cloud',
  })
  address?: string;

  @ApiProperty({
    description: 'Festival start date and time',
    example: '2025-08-22T14:00:00.000Z',
  })
  startDate: Date;

  @ApiProperty({
    description: 'Festival end date and time',
    example: '2025-08-24T23:59:00.000Z',
  })
  endDate: Date;

  @ApiProperty({
    description: 'Current festival status',
    enum: FestivalStatus,
    example: FestivalStatus.PUBLISHED,
  })
  status: FestivalStatus;

  @ApiProperty({
    description: 'Maximum venue capacity',
    example: 40000,
  })
  maxCapacity: number;

  @ApiProperty({
    description: 'Current number of attendees (tickets sold)',
    example: 15000,
  })
  currentAttendees: number;

  @ApiPropertyOptional({
    description: 'Festival logo URL',
    example: 'https://cdn.example.com/logos/rock-en-seine.png',
  })
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Festival banner image URL',
    example: 'https://cdn.example.com/banners/rock-en-seine.jpg',
  })
  bannerUrl?: string;

  @ApiPropertyOptional({
    description: 'Official website URL',
    example: 'https://www.rockenseine.com',
  })
  websiteUrl?: string;

  @ApiPropertyOptional({
    description: 'Contact email address',
    example: 'contact@rockenseine.com',
  })
  contactEmail?: string;

  @ApiProperty({
    description: 'Festival timezone',
    example: 'Europe/Paris',
  })
  timezone: string;

  @ApiProperty({
    description: 'Currency code (ISO 4217)',
    example: 'EUR',
  })
  currency: string;

  @ApiProperty({
    description: 'Creation timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Organizer information',
    type: OrganizerInfoDto,
  })
  organizer?: OrganizerInfoDto;

  @ApiPropertyOptional({
    description: 'Computed: Available capacity',
    example: 25000,
  })
  availableCapacity?: number;

  @ApiPropertyOptional({
    description: 'Computed: Capacity utilization percentage',
    example: 37.5,
  })
  capacityUtilization?: number;

  @ApiPropertyOptional({
    description: 'Computed: Is the festival currently happening',
    example: false,
  })
  isOngoing?: boolean;

  @ApiPropertyOptional({
    description: 'Computed: Days until festival starts (negative if past)',
    example: 45,
  })
  daysUntilStart?: number;
}

/**
 * Festival statistics response DTO
 */
export class FestivalStatsDto {
  @ApiProperty({
    description: 'Festival ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  festivalId: string;

  @ApiProperty({
    description: 'Total tickets sold',
    example: 15000,
  })
  ticketsSold: number;

  @ApiProperty({
    description: 'Total tickets available',
    example: 40000,
  })
  totalTicketsAvailable: number;

  @ApiProperty({
    description: 'Tickets used/scanned',
    example: 0,
  })
  ticketsUsed: number;

  @ApiProperty({
    description: 'Tickets refunded',
    example: 150,
  })
  ticketsRefunded: number;

  @ApiProperty({
    description: 'Tickets cancelled',
    example: 50,
  })
  ticketsCancelled: number;

  @ApiProperty({
    description: 'Total revenue in the festival currency',
    example: 1500000.0,
  })
  totalRevenue: number;

  @ApiProperty({
    description: 'Revenue currency',
    example: 'EUR',
  })
  currency: string;

  @ApiProperty({
    description: 'Average ticket price',
    example: 100.0,
  })
  averageTicketPrice: number;

  @ApiProperty({
    description: 'Sales by ticket category',
    example: [
      { categoryId: 'uuid', categoryName: 'Standard', sold: 10000, revenue: 800000 },
      { categoryId: 'uuid', categoryName: 'VIP', sold: 5000, revenue: 700000 },
    ],
  })
  salesByCategory: CategorySalesDto[];

  @ApiProperty({
    description: 'Capacity utilization percentage',
    example: 37.5,
  })
  capacityUtilization: number;

  @ApiProperty({
    description: 'Number of zones in the festival',
    example: 5,
  })
  zonesCount: number;

  @ApiProperty({
    description: 'Number of staff assigned',
    example: 150,
  })
  staffCount: number;

  @ApiProperty({
    description: 'Cashless transactions stats',
  })
  cashlessStats: CashlessStatsDto;
}

/**
 * Category sales statistics
 */
export class CategorySalesDto {
  @ApiProperty({
    description: 'Category ID',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  categoryId: string;

  @ApiProperty({
    description: 'Category name',
    example: 'Standard',
  })
  categoryName: string;

  @ApiProperty({
    description: 'Tickets sold in this category',
    example: 10000,
  })
  sold: number;

  @ApiProperty({
    description: 'Category quota',
    example: 25000,
  })
  quota: number;

  @ApiProperty({
    description: 'Revenue from this category',
    example: 800000,
  })
  revenue: number;
}

/**
 * Cashless statistics
 */
export class CashlessStatsDto {
  @ApiProperty({
    description: 'Total cashless transactions',
    example: 50000,
  })
  totalTransactions: number;

  @ApiProperty({
    description: 'Total top-ups',
    example: 75000.0,
  })
  totalTopups: number;

  @ApiProperty({
    description: 'Total payments via cashless',
    example: 65000.0,
  })
  totalPayments: number;

  @ApiProperty({
    description: 'Total refunds',
    example: 5000.0,
  })
  totalRefunds: number;
}

/**
 * Paginated festivals response
 */
export class PaginatedFestivalsDto {
  @ApiProperty({
    description: 'List of festivals',
    type: [FestivalResponseDto],
  })
  data: FestivalResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
  })
  meta: PaginationMetaDto;
}

/**
 * Pagination metadata
 */
export class PaginationMetaDto {
  @ApiProperty({
    description: 'Total number of items',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Items per page',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Total pages',
    example: 15,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Has next page',
    example: true,
  })
  hasNextPage: boolean;

  @ApiProperty({
    description: 'Has previous page',
    example: false,
  })
  hasPreviousPage: boolean;
}
