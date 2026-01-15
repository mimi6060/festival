/**
 * PassGenerator - Unified Pass Data Generator
 * Generates pass data structures for both Apple and Google Wallet
 */

import type { WalletPassInfo } from './WalletManager';

// ============================================================================
// Types
// ============================================================================

export interface PassData {
  id: string;
  type: 'eventTicket';

  // Common fields
  serialNumber: string;
  description: string;
  organizationName: string;

  // Event info
  eventName: string;
  eventDate: string;
  eventTime?: string;
  eventLocation: {
    name: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  };

  // Ticket info
  ticketType: string;
  ticketTypeName: string;
  ticketNumber: string;
  holderName: string;
  qrCode: string;

  // Validity
  validFrom: string;
  validUntil: string;

  // Access
  zoneAccess: string[];

  // Visual customization
  colors: PassColors;
  images: PassImages;

  // Additional data
  price?: {
    amount: number;
    currency: string;
  };
  seatInfo?: {
    section?: string;
    row?: string;
    seat?: string;
    gate?: string;
  };
  additionalFields: PassField[];
}

export interface PassColors {
  background: string;
  foreground: string;
  label: string;
  // Hex colors
  backgroundHex: string;
}

export interface PassImages {
  logo?: string;
  icon?: string;
  strip?: string;
  thumbnail?: string;
  hero?: string;
}

export interface PassField {
  key: string;
  label: string;
  value: string;
  type: 'text' | 'date' | 'time' | 'number' | 'currency';
}

export interface GeneratedPass {
  passData: PassData;
  appleFormat?: ApplePassData;
  googleFormat?: GooglePassData;
}

export interface ApplePassData {
  formatVersion: number;
  passTypeIdentifier: string;
  serialNumber: string;
  teamIdentifier: string;
  organizationName: string;
  description: string;
  logoText: string;
  foregroundColor: string;
  backgroundColor: string;
  labelColor: string;
  barcodes: {
    format: string;
    message: string;
    messageEncoding: string;
    altText?: string;
  }[];
  eventTicket: {
    headerFields: { key: string; label: string; value: string }[];
    primaryFields: { key: string; label: string; value: string }[];
    secondaryFields: { key: string; label: string; value: string }[];
    auxiliaryFields: { key: string; label: string; value: string }[];
    backFields: { key: string; label: string; value: string }[];
  };
  relevantDate?: string;
  expirationDate?: string;
  locations?: {
    latitude: number;
    longitude: number;
    relevantText?: string;
  }[];
}

export interface GooglePassData {
  classId: string;
  objectId: string;
  ticketClass: {
    id: string;
    eventName: { defaultValue: { language: string; value: string } };
    venue: {
      name: { defaultValue: { language: string; value: string } };
      address: { defaultValue: { language: string; value: string } };
    };
    dateTime: {
      start: string;
      end?: string;
    };
    hexBackgroundColor: string;
  };
  ticketObject: {
    id: string;
    classId: string;
    state: string;
    ticketHolderName: string;
    ticketNumber: string;
    ticketType: { defaultValue: { language: string; value: string } };
    barcode: {
      type: string;
      value: string;
      alternateText?: string;
    };
    validTimeInterval?: {
      start: { date: string };
      end: { date: string };
    };
  };
}

// ============================================================================
// Color Schemes
// ============================================================================

const TICKET_TYPE_COLORS: Record<string, PassColors> = {
  vip: {
    background: 'rgb(212, 175, 55)',
    foreground: 'rgb(0, 0, 0)',
    label: 'rgb(50, 50, 50)',
    backgroundHex: '#D4AF37',
  },
  premium: {
    background: 'rgb(128, 0, 128)',
    foreground: 'rgb(255, 255, 255)',
    label: 'rgb(220, 180, 255)',
    backgroundHex: '#800080',
  },
  backstage: {
    background: 'rgb(0, 0, 0)',
    foreground: 'rgb(255, 255, 255)',
    label: 'rgb(180, 180, 180)',
    backgroundHex: '#000000',
  },
  general: {
    background: 'rgb(96, 59, 255)',
    foreground: 'rgb(255, 255, 255)',
    label: 'rgb(200, 200, 255)',
    backgroundHex: '#603BFF',
  },
  early_bird: {
    background: 'rgb(255, 140, 0)',
    foreground: 'rgb(255, 255, 255)',
    label: 'rgb(255, 220, 180)',
    backgroundHex: '#FF8C00',
  },
  student: {
    background: 'rgb(0, 128, 0)',
    foreground: 'rgb(255, 255, 255)',
    label: 'rgb(180, 255, 180)',
    backgroundHex: '#008000',
  },
  senior: {
    background: 'rgb(70, 130, 180)',
    foreground: 'rgb(255, 255, 255)',
    label: 'rgb(180, 210, 230)',
    backgroundHex: '#4682B4',
  },
  child: {
    background: 'rgb(255, 99, 71)',
    foreground: 'rgb(255, 255, 255)',
    label: 'rgb(255, 200, 190)',
    backgroundHex: '#FF6347',
  },
  family: {
    background: 'rgb(60, 179, 113)',
    foreground: 'rgb(255, 255, 255)',
    label: 'rgb(180, 230, 200)',
    backgroundHex: '#3CB371',
  },
  press: {
    background: 'rgb(105, 105, 105)',
    foreground: 'rgb(255, 255, 255)',
    label: 'rgb(200, 200, 200)',
    backgroundHex: '#696969',
  },
  staff: {
    background: 'rgb(0, 0, 139)',
    foreground: 'rgb(255, 255, 255)',
    label: 'rgb(150, 150, 255)',
    backgroundHex: '#00008B',
  },
  artist: {
    background: 'rgb(220, 20, 60)',
    foreground: 'rgb(255, 255, 255)',
    label: 'rgb(255, 180, 180)',
    backgroundHex: '#DC143C',
  },
  sponsor: {
    background: 'rgb(25, 25, 112)',
    foreground: 'rgb(255, 215, 0)',
    label: 'rgb(200, 200, 255)',
    backgroundHex: '#191970',
  },
};

// ============================================================================
// PassGenerator Class
// ============================================================================

export class PassGenerator {
  private defaultColors: PassColors = TICKET_TYPE_COLORS.general;

  /**
   * Generate unified pass data from wallet pass info
   */
  public generatePassData(passInfo: WalletPassInfo): PassData {
    const colors = this.getColorsForTicketType(passInfo.ticketType);

    const additionalFields: PassField[] = [];

    // Add zone access info
    if (passInfo.zoneAccess.length > 0) {
      additionalFields.push({
        key: 'zones',
        label: 'Zones accessibles',
        value: passInfo.zoneAccess.join(', '),
        type: 'text',
      });
    }

    // Add any additional info
    if (passInfo.additionalInfo) {
      Object.entries(passInfo.additionalInfo).forEach(([key, value]) => {
        additionalFields.push({
          key,
          label: this.formatLabel(key),
          value,
          type: 'text',
        });
      });
    }

    const passData: PassData = {
      id: passInfo.ticketId,
      type: 'eventTicket',
      serialNumber: passInfo.ticketNumber,
      description: `${passInfo.festivalName} - ${passInfo.ticketTypeName}`,
      organizationName: passInfo.festivalName,
      eventName: passInfo.festivalName,
      eventDate: passInfo.eventDate,
      eventTime: passInfo.eventTime,
      eventLocation: {
        name: passInfo.venue,
        address: passInfo.venueAddress,
      },
      ticketType: passInfo.ticketType,
      ticketTypeName: passInfo.ticketTypeName,
      ticketNumber: passInfo.ticketNumber,
      holderName: passInfo.holderName,
      qrCode: passInfo.qrCode,
      validFrom: passInfo.validFrom,
      validUntil: passInfo.validUntil,
      zoneAccess: passInfo.zoneAccess,
      colors,
      images: {
        logo: passInfo.festivalLogo,
      },
      additionalFields,
    };

    // Add price if available
    if (passInfo.price !== undefined && passInfo.currency) {
      passData.price = {
        amount: passInfo.price,
        currency: passInfo.currency,
      };
    }

    // Add seat info if available
    if (passInfo.seatInfo) {
      passData.seatInfo = this.parseSeatInfo(passInfo.seatInfo);
    }

    return passData;
  }

  /**
   * Generate complete pass with platform-specific formats
   */
  public generateCompletePass(
    passInfo: WalletPassInfo,
    config: {
      apple?: {
        passTypeIdentifier: string;
        teamIdentifier: string;
        organizationName: string;
        webServiceURL?: string;
        authenticationToken?: string;
      };
      google?: {
        issuerId: string;
        classId: string;
      };
    }
  ): GeneratedPass {
    const passData = this.generatePassData(passInfo);
    const result: GeneratedPass = { passData };

    if (config.apple) {
      result.appleFormat = this.generateApplePassData(passData, config.apple);
    }

    if (config.google) {
      result.googleFormat = this.generateGooglePassData(passData, config.google);
    }

    return result;
  }

  /**
   * Generate Apple Wallet pass data structure
   */
  public generateApplePassData(
    passData: PassData,
    config: {
      passTypeIdentifier: string;
      teamIdentifier: string;
      organizationName: string;
      webServiceURL?: string;
      authenticationToken?: string;
    }
  ): ApplePassData {
    return {
      formatVersion: 1,
      passTypeIdentifier: config.passTypeIdentifier,
      serialNumber: passData.serialNumber,
      teamIdentifier: config.teamIdentifier,
      organizationName: config.organizationName,
      description: passData.description,
      logoText: passData.organizationName,
      foregroundColor: passData.colors.foreground,
      backgroundColor: passData.colors.background,
      labelColor: passData.colors.label,
      barcodes: [
        {
          format: 'PKBarcodeFormatQR',
          message: passData.qrCode,
          messageEncoding: 'iso-8859-1',
          altText: passData.ticketNumber,
        },
      ],
      eventTicket: {
        headerFields: [
          {
            key: 'ticketType',
            label: 'TYPE',
            value: passData.ticketTypeName.toUpperCase(),
          },
        ],
        primaryFields: [
          {
            key: 'eventName',
            label: 'EVENEMENT',
            value: passData.eventName,
          },
        ],
        secondaryFields: [
          {
            key: 'date',
            label: 'DATE',
            value: this.formatDate(passData.eventDate),
          },
          {
            key: 'time',
            label: 'HEURE',
            value: passData.eventTime || 'Voir programme',
          },
        ],
        auxiliaryFields: [
          {
            key: 'holder',
            label: 'PARTICIPANT',
            value: passData.holderName,
          },
          {
            key: 'venue',
            label: 'LIEU',
            value: passData.eventLocation.name,
          },
        ],
        backFields: [
          {
            key: 'ticketNumber',
            label: 'Reference du billet',
            value: passData.ticketNumber,
          },
          {
            key: 'validFrom',
            label: 'Valide du',
            value: this.formatDate(passData.validFrom),
          },
          {
            key: 'validUntil',
            label: 'Valide jusqu\'au',
            value: this.formatDate(passData.validUntil),
          },
          {
            key: 'zones',
            label: 'Zones accessibles',
            value: passData.zoneAccess.join(', ') || 'Acces general',
          },
          {
            key: 'terms',
            label: 'Conditions',
            value: 'Ce billet est personnel et non cessible. Presentez ce pass a l\'entree pour validation. Une piece d\'identite peut etre demandee.',
          },
          ...passData.additionalFields.map((field) => ({
            key: field.key,
            label: field.label,
            value: field.value,
          })),
        ],
      },
      relevantDate: passData.eventDate,
      expirationDate: passData.validUntil,
    };
  }

  /**
   * Generate Google Wallet pass data structure
   */
  public generateGooglePassData(
    passData: PassData,
    config: {
      issuerId: string;
      classId: string;
    }
  ): GooglePassData {
    const objectId = `${passData.serialNumber}`;
    const fullClassId = `${config.issuerId}.${config.classId}`;
    const fullObjectId = `${config.issuerId}.${objectId}`;

    return {
      classId: config.classId,
      objectId: objectId,
      ticketClass: {
        id: fullClassId,
        eventName: {
          defaultValue: {
            language: 'fr',
            value: passData.eventName,
          },
        },
        venue: {
          name: {
            defaultValue: {
              language: 'fr',
              value: passData.eventLocation.name,
            },
          },
          address: {
            defaultValue: {
              language: 'fr',
              value: passData.eventLocation.address || passData.eventLocation.name,
            },
          },
        },
        dateTime: {
          start: passData.validFrom,
          end: passData.validUntil,
        },
        hexBackgroundColor: passData.colors.backgroundHex,
      },
      ticketObject: {
        id: fullObjectId,
        classId: fullClassId,
        state: 'ACTIVE',
        ticketHolderName: passData.holderName,
        ticketNumber: passData.ticketNumber,
        ticketType: {
          defaultValue: {
            language: 'fr',
            value: passData.ticketTypeName,
          },
        },
        barcode: {
          type: 'QR_CODE',
          value: passData.qrCode,
          alternateText: passData.ticketNumber,
        },
        validTimeInterval: {
          start: { date: passData.validFrom },
          end: { date: passData.validUntil },
        },
      },
    };
  }

  /**
   * Get colors for a ticket type
   */
  public getColorsForTicketType(ticketType: string): PassColors {
    const normalizedType = ticketType.toLowerCase().replace(/[- ]/g, '_');
    return TICKET_TYPE_COLORS[normalizedType] || this.defaultColors;
  }

  /**
   * Get all available color schemes
   */
  public getAvailableColorSchemes(): Record<string, PassColors> {
    return { ...TICKET_TYPE_COLORS };
  }

  /**
   * Create custom color scheme
   */
  public createCustomColors(
    background: string,
    foreground: string,
    label: string
  ): PassColors {
    return {
      background: this.rgbToString(background),
      foreground: this.rgbToString(foreground),
      label: this.rgbToString(label),
      backgroundHex: this.toHex(background),
    };
  }

  /**
   * Parse seat info from string
   */
  private parseSeatInfo(seatInfo: string): PassData['seatInfo'] {
    // Try to parse common formats like "Section A, Row 5, Seat 12"
    const result: PassData['seatInfo'] = {};

    const sectionMatch = seatInfo.match(/section\s*[:\s]?\s*(\w+)/i);
    if (sectionMatch) {result.section = sectionMatch[1];}

    const rowMatch = seatInfo.match(/row\s*[:\s]?\s*(\w+)/i) || seatInfo.match(/rang\s*[:\s]?\s*(\w+)/i);
    if (rowMatch) {result.row = rowMatch[1];}

    const seatMatch = seatInfo.match(/seat\s*[:\s]?\s*(\w+)/i) || seatInfo.match(/place\s*[:\s]?\s*(\w+)/i);
    if (seatMatch) {result.seat = seatMatch[1];}

    const gateMatch = seatInfo.match(/gate\s*[:\s]?\s*(\w+)/i) || seatInfo.match(/porte\s*[:\s]?\s*(\w+)/i);
    if (gateMatch) {result.gate = gateMatch[1];}

    // If no patterns matched, use the whole string as section
    if (!result.section && !result.row && !result.seat && !result.gate) {
      result.section = seatInfo;
    }

    return result;
  }

  /**
   * Format label from camelCase or snake_case
   */
  private formatLabel(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^\w/, (c) => c.toUpperCase())
      .trim();
  }

  /**
   * Format date for display
   */
  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  }

  /**
   * Convert color to RGB string format
   */
  private rgbToString(color: string): string {
    if (color.startsWith('rgb')) {
      return color;
    }
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgb(${r}, ${g}, ${b})`;
    }
    return color;
  }

  /**
   * Convert color to hex format
   */
  private toHex(color: string): string {
    if (color.startsWith('#')) {
      return color.toUpperCase();
    }
    if (color.startsWith('rgb')) {
      const match = color.match(/(\d+)/g);
      if (match && match.length >= 3) {
        const r = parseInt(match[0]).toString(16).padStart(2, '0');
        const g = parseInt(match[1]).toString(16).padStart(2, '0');
        const b = parseInt(match[2]).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`.toUpperCase();
      }
    }
    return '#000000';
  }
}

export default PassGenerator;
