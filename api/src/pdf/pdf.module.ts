import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PdfController } from './pdf.controller';
import { PdfService } from './pdf.service';
import { TicketsModule } from '../tickets/tickets.module';
import { PaymentsModule } from '../payments/payments.module';
import { FestivalModule } from '../festival/festival.module';

/**
 * PDF Module
 *
 * Provides PDF generation functionality including:
 * - Ticket PDFs with QR codes
 * - Invoice/Receipt PDFs
 * - Staff badge PDFs
 * - Analytics report PDFs
 *
 * Dependencies:
 * - PrismaModule (global) for database access
 * - ConfigModule for configuration
 * - TicketsModule for ticket data
 * - PaymentsModule for payment data
 * - FestivalModule for festival data
 *
 * Controllers:
 * - PdfController: REST API endpoints for PDF downloads
 *
 * Providers:
 * - PdfService: PDF generation logic
 */
@Module({
  imports: [
    ConfigModule,
    TicketsModule,
    PaymentsModule,
    FestivalModule,
  ],
  controllers: [PdfController],
  providers: [PdfService],
  exports: [PdfService],
})
export class PdfModule {}
