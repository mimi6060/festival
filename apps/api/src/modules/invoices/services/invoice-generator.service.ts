/**
 * Invoice Generator Service
 *
 * Handles invoice number generation and calculations:
 * - Sequential invoice numbers per festival
 * - Subtotal, tax, and total calculations
 * - Currency formatting
 * - Multi-language support
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CurrencyService } from '../../currency/currency.service';
import { SupportedCurrency } from '../../currency/dto';
import { CreateInvoiceItemDto } from '../dto';

export interface CalculatedInvoice {
  subtotal: number;
  taxAmount: number;
  total: number;
  items: CalculatedItem[];
}

export interface CalculatedItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  taxRate?: number;
  taxAmount?: number;
  itemType?: string;
  itemId?: string;
  metadata?: Record<string, unknown>;
  sortOrder: number;
}

export interface InvoiceNumberInfo {
  invoiceNumber: string;
  year: number;
  festivalCode: string;
  sequence: number;
}

@Injectable()
export class InvoiceGeneratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currencyService: CurrencyService,
  ) {}

  /**
   * Generate a unique invoice number for a festival
   * Format: INV-{YEAR}-{FESTIVAL_CODE}-{SEQUENCE}
   */
  async generateInvoiceNumber(festivalId: string): Promise<InvoiceNumberInfo> {
    const year = new Date().getFullYear();

    // Get festival info for the code
    const festival = await this.prisma.festival.findUnique({
      where: { id: festivalId },
      select: { slug: true, name: true },
    });

    // Generate festival code (first 4 chars of slug, uppercase)
    const festivalCode = (festival?.slug || festivalId.substring(0, 4))
      .substring(0, 4)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');

    // Get the next sequence number for this festival and year
    const lastInvoice = await this.prisma.invoice.findFirst({
      where: {
        festivalId,
        invoiceNumber: {
          startsWith: `INV-${year}-${festivalCode}-`,
        },
      },
      orderBy: {
        invoiceNumber: 'desc',
      },
      select: {
        invoiceNumber: true,
      },
    });

    let sequence = 1;
    if (lastInvoice) {
      const parts = lastInvoice.invoiceNumber.split('-');
      const lastPart = parts[parts.length - 1];
      if (lastPart) {
        const lastSequence = parseInt(lastPart, 10);
        if (!isNaN(lastSequence)) {
          sequence = lastSequence + 1;
        }
      }
    }

    const invoiceNumber = `INV-${year}-${festivalCode}-${sequence.toString().padStart(4, '0')}`;

    return {
      invoiceNumber,
      year,
      festivalCode,
      sequence,
    };
  }

  /**
   * Calculate invoice totals from items
   */
  calculateInvoice(
    items: CreateInvoiceItemDto[],
    defaultTaxRate: number = 20,
    taxExempt: boolean = false,
    reverseCharge: boolean = false,
  ): CalculatedInvoice {
    let subtotal = 0;
    let totalTax = 0;

    const calculatedItems: CalculatedItem[] = items.map((item, index) => {
      const itemTotal = item.quantity * item.unitPrice;
      subtotal += itemTotal;

      // Determine tax rate for this item
      let itemTaxRate = item.taxRate !== undefined ? item.taxRate : defaultTaxRate;
      let itemTaxAmount = 0;

      // Apply tax unless exempt or reverse charge
      if (!taxExempt && !reverseCharge) {
        itemTaxAmount = this.roundToTwo(itemTotal * (itemTaxRate / 100));
        totalTax += itemTaxAmount;
      } else {
        itemTaxRate = 0;
      }

      return {
        description: item.description,
        quantity: item.quantity,
        unitPrice: this.roundToTwo(item.unitPrice),
        total: this.roundToTwo(itemTotal),
        taxRate: itemTaxRate,
        taxAmount: this.roundToTwo(itemTaxAmount),
        itemType: item.itemType,
        itemId: item.itemId,
        metadata: item.metadata,
        sortOrder: item.sortOrder ?? index,
      };
    });

    const total = subtotal + totalTax;

    return {
      subtotal: this.roundToTwo(subtotal),
      taxAmount: this.roundToTwo(totalTax),
      total: this.roundToTwo(total),
      items: calculatedItems,
    };
  }

  /**
   * Calculate amounts with currency conversion
   */
  async calculateWithConversion(
    items: CreateInvoiceItemDto[],
    baseCurrency: string,
    targetCurrency: string,
    defaultTaxRate: number = 20,
    taxExempt: boolean = false,
    reverseCharge: boolean = false,
  ): Promise<{
    base: CalculatedInvoice;
    original: CalculatedInvoice;
    exchangeRate: number;
  }> {
    // Calculate in target currency (user's currency)
    const original = this.calculateInvoice(items, defaultTaxRate, taxExempt, reverseCharge);

    // If same currency, no conversion needed
    if (baseCurrency === targetCurrency) {
      return {
        base: original,
        original,
        exchangeRate: 1,
      };
    }

    // Convert to base currency
    const conversion = await this.currencyService.convert(
      original.total,
      targetCurrency as SupportedCurrency,
      baseCurrency as SupportedCurrency,
      { trackRate: true },
    );

    // Calculate converted amounts
    const baseSubtotal = this.roundToTwo(original.subtotal * conversion.exchangeRate);
    const baseTax = this.roundToTwo(original.taxAmount * conversion.exchangeRate);
    const baseTotal = this.roundToTwo(original.total * conversion.exchangeRate);

    const convertedItems: CalculatedItem[] = original.items.map((item) => ({
      ...item,
      unitPrice: this.roundToTwo(item.unitPrice * conversion.exchangeRate),
      total: this.roundToTwo(item.total * conversion.exchangeRate),
      taxAmount: item.taxAmount
        ? this.roundToTwo(item.taxAmount * conversion.exchangeRate)
        : undefined,
    }));

    return {
      base: {
        subtotal: baseSubtotal,
        taxAmount: baseTax,
        total: baseTotal,
        items: convertedItems,
      },
      original,
      exchangeRate: conversion.exchangeRate,
    };
  }

  /**
   * Format price for display
   */
  formatPrice(amount: number, currency: string, locale: string = 'fr'): string {
    return this.currencyService.formatPrice(
      amount,
      currency as SupportedCurrency,
      locale as 'en' | 'fr',
    ).formatted;
  }

  /**
   * Get localized invoice labels
   */
  getLocalizedLabels(
    locale: string,
  ): Record<string, string> {
    const labels: Record<string, Record<string, string>> = {
      fr: {
        invoice: 'FACTURE',
        invoiceNumber: 'N de facture',
        issueDate: 'Date demission',
        dueDate: 'Date decheance',
        billTo: 'Facturer a',
        from: 'De',
        description: 'Description',
        quantity: 'Qte',
        unitPrice: 'Prix unitaire',
        total: 'Total',
        subtotal: 'Sous-total HT',
        tax: 'TVA',
        totalDue: 'Total TTC',
        paid: 'PAYEE',
        unpaid: 'A PAYER',
        overdue: 'EN RETARD',
        draft: 'BROUILLON',
        cancelled: 'ANNULEE',
        vatNumber: 'N TVA',
        paymentTerms: 'Conditions de paiement',
        notes: 'Notes',
        reverseCharge: 'Autoliquidation de la TVA',
        taxExempt: 'Exonere de TVA',
        thankYou: 'Merci pour votre confiance',
        page: 'Page',
        of: 'sur',
      },
      en: {
        invoice: 'INVOICE',
        invoiceNumber: 'Invoice Number',
        issueDate: 'Issue Date',
        dueDate: 'Due Date',
        billTo: 'Bill To',
        from: 'From',
        description: 'Description',
        quantity: 'Qty',
        unitPrice: 'Unit Price',
        total: 'Total',
        subtotal: 'Subtotal',
        tax: 'Tax',
        totalDue: 'Total Due',
        paid: 'PAID',
        unpaid: 'UNPAID',
        overdue: 'OVERDUE',
        draft: 'DRAFT',
        cancelled: 'CANCELLED',
        vatNumber: 'VAT Number',
        paymentTerms: 'Payment Terms',
        notes: 'Notes',
        reverseCharge: 'Reverse Charge VAT',
        taxExempt: 'Tax Exempt',
        thankYou: 'Thank you for your business',
        page: 'Page',
        of: 'of',
      },
      de: {
        invoice: 'RECHNUNG',
        invoiceNumber: 'Rechnungsnummer',
        issueDate: 'Rechnungsdatum',
        dueDate: 'Falligkeitsdatum',
        billTo: 'Rechnungsempfanger',
        from: 'Von',
        description: 'Beschreibung',
        quantity: 'Menge',
        unitPrice: 'Einzelpreis',
        total: 'Gesamt',
        subtotal: 'Zwischensumme',
        tax: 'MwSt.',
        totalDue: 'Gesamtbetrag',
        paid: 'BEZAHLT',
        unpaid: 'UNBEZAHLT',
        overdue: 'UBERFALLIG',
        draft: 'ENTWURF',
        cancelled: 'STORNIERT',
        vatNumber: 'USt-IdNr.',
        paymentTerms: 'Zahlungsbedingungen',
        notes: 'Anmerkungen',
        reverseCharge: 'Umkehrung der Steuerschuld',
        taxExempt: 'Steuerfrei',
        thankYou: 'Vielen Dank fur Ihren Auftrag',
        page: 'Seite',
        of: 'von',
      },
      es: {
        invoice: 'FACTURA',
        invoiceNumber: 'Numero de factura',
        issueDate: 'Fecha de emision',
        dueDate: 'Fecha de vencimiento',
        billTo: 'Facturar a',
        from: 'De',
        description: 'Descripcion',
        quantity: 'Cant.',
        unitPrice: 'Precio unitario',
        total: 'Total',
        subtotal: 'Subtotal',
        tax: 'IVA',
        totalDue: 'Total a pagar',
        paid: 'PAGADA',
        unpaid: 'PENDIENTE',
        overdue: 'VENCIDA',
        draft: 'BORRADOR',
        cancelled: 'ANULADA',
        vatNumber: 'NIF/CIF',
        paymentTerms: 'Condiciones de pago',
        notes: 'Notas',
        reverseCharge: 'Inversion del sujeto pasivo',
        taxExempt: 'Exento de IVA',
        thankYou: 'Gracias por su confianza',
        page: 'Pagina',
        of: 'de',
      },
      it: {
        invoice: 'FATTURA',
        invoiceNumber: 'Numero fattura',
        issueDate: 'Data di emissione',
        dueDate: 'Data di scadenza',
        billTo: 'Fatturare a',
        from: 'Da',
        description: 'Descrizione',
        quantity: 'Qta',
        unitPrice: 'Prezzo unitario',
        total: 'Totale',
        subtotal: 'Subtotale',
        tax: 'IVA',
        totalDue: 'Totale dovuto',
        paid: 'PAGATA',
        unpaid: 'DA PAGARE',
        overdue: 'SCADUTA',
        draft: 'BOZZA',
        cancelled: 'ANNULLATA',
        vatNumber: 'Partita IVA',
        paymentTerms: 'Condizioni di pagamento',
        notes: 'Note',
        reverseCharge: 'Inversione contabile',
        taxExempt: 'Esente IVA',
        thankYou: 'Grazie per la vostra fiducia',
        page: 'Pagina',
        of: 'di',
      },
      nl: {
        invoice: 'FACTUUR',
        invoiceNumber: 'Factuurnummer',
        issueDate: 'Factuurdatum',
        dueDate: 'Vervaldatum',
        billTo: 'Factuur aan',
        from: 'Van',
        description: 'Omschrijving',
        quantity: 'Aantal',
        unitPrice: 'Eenheidsprijs',
        total: 'Totaal',
        subtotal: 'Subtotaal',
        tax: 'BTW',
        totalDue: 'Totaal verschuldigd',
        paid: 'BETAALD',
        unpaid: 'ONBETAALD',
        overdue: 'VERVALLEN',
        draft: 'CONCEPT',
        cancelled: 'GEANNULEERD',
        vatNumber: 'BTW-nummer',
        paymentTerms: 'Betalingsvoorwaarden',
        notes: 'Opmerkingen',
        reverseCharge: 'Verlegging BTW',
        taxExempt: 'Vrijgesteld van BTW',
        thankYou: 'Bedankt voor uw vertrouwen',
        page: 'Pagina',
        of: 'van',
      },
    };

    return labels[locale] ?? labels['en'] ?? {};
  }

  /**
   * Format date for invoice
   */
  formatDate(date: Date, locale: string = 'fr'): string {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };

    const localeMap: Record<string, string> = {
      fr: 'fr-FR',
      en: 'en-US',
      de: 'de-DE',
      es: 'es-ES',
      it: 'it-IT',
      nl: 'nl-NL',
    };

    return new Date(date).toLocaleDateString(localeMap[locale] || 'en-US', options);
  }

  /**
   * Round to 2 decimal places
   */
  private roundToTwo(num: number): number {
    return Math.round(num * 100) / 100;
  }
}
