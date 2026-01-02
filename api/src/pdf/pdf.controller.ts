import {
  Controller,
  Get,
  Param,
  Res,
  UseGuards,
  HttpStatus,
  Logger,
  Query,
} from '@nestjs/common';
import { Response } from 'express';
import { PdfService } from './pdf.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

/**
 * PDF Controller
 *
 * Provides endpoints for generating and downloading PDFs:
 * - Ticket PDFs with QR codes
 * - Invoice/Receipt PDFs
 * - Staff badge PDFs
 * - Analytics report PDFs
 */
@Controller()
@UseGuards(JwtAuthGuard)
export class PdfController {
  private readonly logger = new Logger(PdfController.name);

  constructor(private readonly pdfService: PdfService) {}

  /**
   * Download ticket as PDF
   * GET /tickets/:id/pdf
   *
   * Generates a PDF ticket with:
   * - Festival information
   * - QR code for entrance
   * - User information
   * - Ticket details
   * - Terms and conditions summary
   */
  @Get('tickets/:id/pdf')
  async downloadTicketPdf(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(`Generating ticket PDF for ticket ${id} by user ${user.id}`);

    try {
      const pdfBuffer = await this.pdfService.generateTicketPdf(id, user.id);

      const filename = `ticket-${id.substring(0, 8)}.pdf`;

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      });

      res.status(HttpStatus.OK).send(pdfBuffer);
    } catch (error) {
      this.logger.error(`Failed to generate ticket PDF: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Download payment invoice as PDF
   * GET /payments/:id/invoice
   *
   * Generates an invoice PDF with:
   * - Company information
   * - Customer details
   * - Itemized list of purchases
   * - Payment details
   * - Total amount
   */
  @Get('payments/:id/invoice')
  async downloadInvoicePdf(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(`Generating invoice PDF for payment ${id} by user ${user.id}`);

    try {
      const pdfBuffer = await this.pdfService.generateInvoicePdf(id, user.id);

      const filename = `invoice-${id.substring(0, 8)}.pdf`;

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      });

      res.status(HttpStatus.OK).send(pdfBuffer);
    } catch (error) {
      this.logger.error(`Failed to generate invoice PDF: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Download staff badge as PDF
   * GET /staff/:id/badge
   *
   * Generates a staff badge PDF with:
   * - Staff name and role
   * - Festival information
   * - Zone assignment (if any)
   * - Schedule
   * - QR code for verification
   */
  @Get('staff/:id/badge')
  async downloadBadgePdf(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(`Generating badge PDF for assignment ${id} by user ${user.id}`);

    try {
      const pdfBuffer = await this.pdfService.generateBadgePdf(id, user.id);

      const filename = `badge-${id.substring(0, 8)}.pdf`;

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      });

      res.status(HttpStatus.OK).send(pdfBuffer);
    } catch (error) {
      this.logger.error(`Failed to generate badge PDF: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Download analytics report as PDF
   * GET /festivals/:id/report
   *
   * Generates an analytics report PDF with:
   * - Ticket sales statistics
   * - Revenue breakdown
   * - Cashless transaction statistics
   * - Category-wise analysis
   *
   * Only available to festival organizers and admins.
   */
  @Get('festivals/:id/report')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZER)
  async downloadReportPdf(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(`Generating report PDF for festival ${id} by user ${user.id}`);

    try {
      const pdfBuffer = await this.pdfService.generateReportPdf(id, user.id);

      const filename = `report-${id.substring(0, 8)}-${Date.now()}.pdf`;

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      });

      res.status(HttpStatus.OK).send(pdfBuffer);
    } catch (error) {
      this.logger.error(`Failed to generate report PDF: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * View ticket PDF inline (for preview)
   * GET /tickets/:id/pdf/view
   */
  @Get('tickets/:id/pdf/view')
  async viewTicketPdf(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(`Viewing ticket PDF for ticket ${id} by user ${user.id}`);

    try {
      const pdfBuffer = await this.pdfService.generateTicketPdf(id, user.id);

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline',
        'Content-Length': pdfBuffer.length,
        'Cache-Control': 'private, max-age=300',
      });

      res.status(HttpStatus.OK).send(pdfBuffer);
    } catch (error) {
      this.logger.error(`Failed to view ticket PDF: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * View invoice PDF inline (for preview)
   * GET /payments/:id/invoice/view
   */
  @Get('payments/:id/invoice/view')
  async viewInvoicePdf(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(`Viewing invoice PDF for payment ${id} by user ${user.id}`);

    try {
      const pdfBuffer = await this.pdfService.generateInvoicePdf(id, user.id);

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline',
        'Content-Length': pdfBuffer.length,
        'Cache-Control': 'private, max-age=300',
      });

      res.status(HttpStatus.OK).send(pdfBuffer);
    } catch (error) {
      this.logger.error(`Failed to view invoice PDF: ${error.message}`, error.stack);
      throw error;
    }
  }
}
