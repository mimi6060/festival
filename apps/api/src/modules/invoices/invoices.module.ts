/**
 * Invoices Module
 *
 * Multi-currency invoicing system for the Festival platform.
 * Features:
 * - Invoice creation and management
 * - Multi-currency support with conversion
 * - VAT/tax calculation by country
 * - PDF generation with multiple templates
 * - Email notifications (invoice, reminders, receipts)
 * - Invoice statistics and reporting
 */

import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { CurrencyModule } from '../currency/currency.module';
import { EmailModule } from '../email/email.module';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InvoiceGeneratorService } from './services/invoice-generator.service';
import { TaxService } from './services/tax.service';
import { InvoicePdfService } from './services/invoice-pdf.service';
import { InvoiceEmailService } from './services/invoice-email.service';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    forwardRef(() => CurrencyModule),
    EmailModule,
  ],
  controllers: [InvoicesController],
  providers: [
    InvoicesService,
    InvoiceGeneratorService,
    TaxService,
    InvoicePdfService,
    InvoiceEmailService,
  ],
  exports: [
    InvoicesService,
    InvoiceGeneratorService,
    TaxService,
    InvoicePdfService,
    InvoiceEmailService,
  ],
})
export class InvoicesModule {}
