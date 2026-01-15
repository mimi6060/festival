import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import ical, { ICalCalendar, ICalEventStatus } from 'ical-generator';

interface CalendarOptions {
  festivalId: string;
  artistIds?: string[];
  date?: string;
  includeDescription?: boolean;
}

@Injectable()
export class ICalExportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate an iCal calendar for a festival's performances
   */
  async generateCalendar(options: CalendarOptions): Promise<ICalCalendar> {
    const { festivalId, artistIds, date, includeDescription = true } = options;

    // Get festival details
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        startDate: true,
        endDate: true,
        location: true,
        website: true,
      },
    });

    if (!festival) {
      throw new NotFoundException(`Festival with ID "${festivalId}" not found`);
    }

    // Build performances query
    const whereClause: {
      festivalId: string;
      artistId?: { in: string[] };
      date?: Date;
    } = {
      festivalId,
    };

    if (artistIds?.length) {
      whereClause.artistId = { in: artistIds };
    }

    if (date) {
      whereClause.date = new Date(date);
    }

    // Get performances with artist and stage details
    const performances = await this.prisma.performance.findMany({
      where: whereClause,
      include: {
        artist: {
          select: {
            id: true,
            name: true,
            shortBio: true,
            genres: true,
            country: true,
          },
        },
        stage: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    // Create calendar
    const calendar = ical({
      name: `${festival.name} - Programme`,
      description: festival.description || `Programme du festival ${festival.name}`,
      prodId: {
        company: 'Festival Platform',
        product: 'Festival Calendar',
        language: 'FR',
      },
      timezone: 'Europe/Paris',
      url: festival.website || undefined,
    });

    // Add events for each performance
    for (const performance of performances) {
      const startDateTime = this.combineDateAndTime(performance.date, performance.startTime);
      const endDateTime = this.combineDateAndTime(performance.date, performance.endTime);

      // Handle overnight performances
      if (endDateTime < startDateTime) {
        endDateTime.setDate(endDateTime.getDate() + 1);
      }

      let description = '';
      if (includeDescription) {
        const parts: string[] = [];

        if (performance.artist.shortBio) {
          parts.push(performance.artist.shortBio);
        }

        if (performance.artist.genres?.length) {
          parts.push(`Genres: ${performance.artist.genres.join(', ')}`);
        }

        if (performance.artist.country) {
          parts.push(`Pays: ${performance.artist.country}`);
        }

        if (performance.notes) {
          parts.push(`Notes: ${performance.notes}`);
        }

        description = parts.join('\n\n');
      }

      const locationString =
        performance.stage.name + (festival.location ? ` - ${festival.location}` : '');

      calendar.createEvent({
        id: `${performance.id}@festival.app`,
        start: startDateTime,
        end: endDateTime,
        summary: `${performance.artist.name} @ ${performance.stage.name}`,
        description: description || undefined,
        location: locationString,
        categories: [{ name: 'Concert' }, { name: performance.stage.name }],
        status: this.mapPerformanceStatus(performance.status),
        url: festival.website ? `${festival.website}/program/${performance.artist.id}` : undefined,
      });
    }

    return calendar;
  }

  /**
   * Generate calendar as string
   */
  async generateCalendarString(options: CalendarOptions): Promise<string> {
    const calendar = await this.generateCalendar(options);
    return calendar.toString();
  }

  /**
   * Combine date and time string into Date object
   */
  private combineDateAndTime(date: Date, timeStr: string): Date {
    const result = new Date(date);
    const [hours = 0, minutes = 0] = timeStr.split(':').map(Number);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  /**
   * Map performance status to iCal event status
   */
  private mapPerformanceStatus(status: string): ICalEventStatus {
    switch (status) {
      case 'CANCELLED':
        return ICalEventStatus.CANCELLED;
      case 'LIVE':
      case 'COMPLETED':
      case 'SCHEDULED':
        return ICalEventStatus.CONFIRMED;
      case 'DELAYED':
        return ICalEventStatus.TENTATIVE;
      default:
        return ICalEventStatus.CONFIRMED;
    }
  }
}
