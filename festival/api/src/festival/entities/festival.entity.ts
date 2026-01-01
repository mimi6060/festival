import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Festival status enum matching Prisma schema
 */
export enum FestivalStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

/**
 * User role enum for authorization
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  ORGANIZER = 'ORGANIZER',
  STAFF = 'STAFF',
  CASHIER = 'CASHIER',
  SECURITY = 'SECURITY',
  USER = 'USER',
}

/**
 * Festival entity for Swagger documentation
 */
export class FestivalEntity {
  @ApiProperty({
    description: 'Unique identifier (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Organizer user ID (multi-tenant)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  organizerId: string;

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
    description: 'Soft delete flag',
    example: false,
  })
  isDeleted: boolean;

  @ApiPropertyOptional({
    description: 'Deletion timestamp',
  })
  deletedAt?: Date;

  @ApiProperty({
    description: 'Creation timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
  })
  updatedAt: Date;
}

/**
 * Festival with statistics for dashboard/admin views
 */
export class FestivalWithStats extends FestivalEntity {
  @ApiProperty({
    description: 'Total tickets sold',
    example: 15000,
  })
  ticketsSold: number;

  @ApiProperty({
    description: 'Total revenue in cents',
    example: 1500000,
  })
  totalRevenue: number;

  @ApiProperty({
    description: 'Number of ticket categories',
    example: 5,
  })
  categoriesCount: number;

  @ApiProperty({
    description: 'Capacity utilization percentage',
    example: 37.5,
  })
  capacityUtilization: number;
}

/**
 * Paginated response wrapper
 */
export class PaginatedFestivalsResponse {
  @ApiProperty({
    description: 'List of festivals',
    type: [FestivalEntity],
  })
  data: FestivalEntity[];

  @ApiProperty({
    description: 'Total number of festivals matching the query',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number (1-based)',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 15,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Whether there is a next page',
    example: true,
  })
  hasNextPage: boolean;

  @ApiProperty({
    description: 'Whether there is a previous page',
    example: false,
  })
  hasPreviousPage: boolean;
}
