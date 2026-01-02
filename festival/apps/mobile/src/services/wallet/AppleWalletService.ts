/**
 * AppleWalletService - Apple Wallet (PassKit) Integration
 * Handles .pkpass file generation and wallet interactions
 */

import { NativeModules, Platform, Linking } from 'react-native';

// ============================================================================
// Types
// ============================================================================

export interface AppleWalletConfig {
  passTypeIdentifier: string;
  teamIdentifier: string;
  organizationName: string;
  webServiceURL?: string;
  authenticationToken?: string;
}

export interface AppleWalletAvailability {
  isAvailable: boolean;
  canAddPasses: boolean;
  reason?: string;
}

export interface ApplePassResult {
  success: boolean;
  error?: string;
  passId?: string;
}

export interface ApplePassStructure {
  formatVersion: number;
  passTypeIdentifier: string;
  serialNumber: string;
  teamIdentifier: string;
  organizationName: string;
  description: string;
  logoText?: string;
  foregroundColor: string;
  backgroundColor: string;
  labelColor: string;
  webServiceURL?: string;
  authenticationToken?: string;
  barcode?: ApplePassBarcode;
  barcodes?: ApplePassBarcode[];
  eventTicket?: ApplePassFields;
  locations?: ApplePassLocation[];
  relevantDate?: string;
  expirationDate?: string;
  voided?: boolean;
  nfc?: ApplePassNFC;
  semantics?: ApplePassSemantics;
}

export interface ApplePassBarcode {
  format: 'PKBarcodeFormatQR' | 'PKBarcodeFormatPDF417' | 'PKBarcodeFormatAztec' | 'PKBarcodeFormatCode128';
  message: string;
  messageEncoding: string;
  altText?: string;
}

export interface ApplePassField {
  key: string;
  label: string;
  value: string | number;
  textAlignment?: 'PKTextAlignmentLeft' | 'PKTextAlignmentCenter' | 'PKTextAlignmentRight' | 'PKTextAlignmentNatural';
  dateStyle?: 'PKDateStyleNone' | 'PKDateStyleShort' | 'PKDateStyleMedium' | 'PKDateStyleLong' | 'PKDateStyleFull';
  timeStyle?: 'PKDateStyleNone' | 'PKDateStyleShort' | 'PKDateStyleMedium' | 'PKDateStyleLong' | 'PKDateStyleFull';
  isRelative?: boolean;
  changeMessage?: string;
  semantics?: ApplePassSemanticTag;
}

export interface ApplePassSemanticTag {
  eventName?: string;
  eventType?: string;
  venueName?: string;
  venueLocation?: {
    latitude: number;
    longitude: number;
  };
  venueEntrance?: string;
  eventStartDate?: string;
  eventEndDate?: string;
  duration?: number;
  seats?: {
    seatSection?: string;
    seatRow?: string;
    seatNumber?: string;
    seatIdentifier?: string;
    seatType?: string;
    seatDescription?: string;
  }[];
  performerNames?: string[];
  genre?: string;
  silenceRequested?: boolean;
}

export interface ApplePassFields {
  headerFields?: ApplePassField[];
  primaryFields?: ApplePassField[];
  secondaryFields?: ApplePassField[];
  auxiliaryFields?: ApplePassField[];
  backFields?: ApplePassField[];
}

export interface ApplePassLocation {
  latitude: number;
  longitude: number;
  altitude?: number;
  relevantText?: string;
}

export interface ApplePassNFC {
  message: string;
  encryptionPublicKey?: string;
}

export interface ApplePassSemantics {
  eventName?: string;
  eventType?: 'PKEventTypeGeneric' | 'PKEventTypeLivePerformance' | 'PKEventTypeMovie' | 'PKEventTypeSports' | 'PKEventTypeConference' | 'PKEventTypeConvention' | 'PKEventTypeWorkshop' | 'PKEventTypeSocialGathering';
  venueName?: string;
  venueLocation?: {
    latitude: number;
    longitude: number;
  };
}

// ============================================================================
// Native Module Interface
// ============================================================================

interface PassKitNativeModule {
  canAddPasses(): Promise<boolean>;
  containsPass(passTypeIdentifier: string, serialNumber: string): Promise<boolean>;
  addPass(passUrl: string): Promise<{ success: boolean; error?: string }>;
  removePass(passTypeIdentifier: string, serialNumber: string): Promise<boolean>;
  openWalletApp(): Promise<void>;
}

// Get native module (will be undefined if not implemented)
const PassKitModule = NativeModules.PassKit as PassKitNativeModule | undefined;

// ============================================================================
// AppleWalletService Class
// ============================================================================

export class AppleWalletService {
  private config: AppleWalletConfig | null = null;
  private initialized = false;

  /**
   * Initialize the Apple Wallet service
   */
  public async initialize(config: AppleWalletConfig): Promise<void> {
    if (Platform.OS !== 'ios') {
      throw new Error('AppleWalletService is only available on iOS');
    }

    this.config = config;
    this.initialized = true;
  }

  /**
   * Check Apple Wallet availability
   */
  public async checkAvailability(): Promise<AppleWalletAvailability> {
    if (Platform.OS !== 'ios') {
      return {
        isAvailable: false,
        canAddPasses: false,
        reason: 'Apple Wallet is only available on iOS',
      };
    }

    try {
      // Check if PassKit native module is available
      if (!PassKitModule) {
        // Fallback: Check if Wallet app URL can be opened
        const canOpenWallet = await Linking.canOpenURL('shoebox://');
        return {
          isAvailable: canOpenWallet,
          canAddPasses: canOpenWallet,
          reason: canOpenWallet ? undefined : 'PassKit not available',
        };
      }

      const canAdd = await PassKitModule.canAddPasses();
      return {
        isAvailable: true,
        canAddPasses: canAdd,
        reason: canAdd ? undefined : 'Device cannot add passes',
      };
    } catch (error) {
      return {
        isAvailable: false,
        canAddPasses: false,
        reason: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check if a specific pass is already in wallet
   */
  public async isPassAdded(ticketId: string): Promise<boolean> {
    if (!this.initialized || !this.config) {
      return false;
    }

    try {
      if (PassKitModule) {
        return await PassKitModule.containsPass(
          this.config.passTypeIdentifier,
          ticketId
        );
      }
      return false;
    } catch (error) {
      console.error('Error checking if pass is added:', error);
      return false;
    }
  }

  /**
   * Add pass to Apple Wallet
   */
  public async addPass(passUrl: string): Promise<ApplePassResult> {
    if (Platform.OS !== 'ios') {
      return {
        success: false,
        error: 'Apple Wallet is only available on iOS',
      };
    }

    try {
      if (PassKitModule) {
        // Use native module
        const result = await PassKitModule.addPass(passUrl);
        return result;
      }

      // Fallback: Open URL directly
      const canOpen = await Linking.canOpenURL(passUrl);
      if (canOpen) {
        await Linking.openURL(passUrl);
        return { success: true };
      }

      return {
        success: false,
        error: 'Cannot open pass URL',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add pass',
      };
    }
  }

  /**
   * Remove pass from Apple Wallet
   */
  public async removePass(ticketId: string): Promise<boolean> {
    if (!this.initialized || !this.config) {
      return false;
    }

    try {
      if (PassKitModule) {
        return await PassKitModule.removePass(
          this.config.passTypeIdentifier,
          ticketId
        );
      }
      return false;
    } catch (error) {
      console.error('Error removing pass:', error);
      return false;
    }
  }

  /**
   * Open Apple Wallet app
   */
  public async openWallet(): Promise<void> {
    try {
      if (PassKitModule) {
        await PassKitModule.openWalletApp();
        return;
      }

      // Fallback: Try opening Wallet app URL
      const walletUrl = 'shoebox://';
      const canOpen = await Linking.canOpenURL(walletUrl);
      if (canOpen) {
        await Linking.openURL(walletUrl);
      }
    } catch (error) {
      console.error('Error opening Wallet app:', error);
    }
  }

  /**
   * Generate Apple Pass structure (for preview)
   */
  public generatePassStructure(
    ticketId: string,
    festivalName: string,
    ticketType: string,
    holderName: string,
    eventDate: string,
    eventTime: string,
    venue: string,
    qrCode: string,
    options: {
      backgroundColor?: string;
      foregroundColor?: string;
      labelColor?: string;
      logoText?: string;
      locations?: ApplePassLocation[];
      additionalFields?: ApplePassField[];
    } = {}
  ): ApplePassStructure {
    if (!this.config) {
      throw new Error('AppleWalletService not initialized');
    }

    const {
      backgroundColor = 'rgb(96, 59, 255)',
      foregroundColor = 'rgb(255, 255, 255)',
      labelColor = 'rgb(200, 200, 255)',
      logoText = festivalName,
      locations = [],
      additionalFields = [],
    } = options;

    return {
      formatVersion: 1,
      passTypeIdentifier: this.config.passTypeIdentifier,
      serialNumber: ticketId,
      teamIdentifier: this.config.teamIdentifier,
      organizationName: this.config.organizationName,
      description: `${festivalName} - ${ticketType}`,
      logoText,
      foregroundColor,
      backgroundColor,
      labelColor,
      webServiceURL: this.config.webServiceURL,
      authenticationToken: this.config.authenticationToken,
      barcodes: [
        {
          format: 'PKBarcodeFormatQR',
          message: qrCode,
          messageEncoding: 'iso-8859-1',
          altText: ticketId.toUpperCase(),
        },
      ],
      eventTicket: {
        headerFields: [
          {
            key: 'ticketType',
            label: 'TYPE',
            value: ticketType.toUpperCase(),
          },
        ],
        primaryFields: [
          {
            key: 'eventName',
            label: 'EVENEMENT',
            value: festivalName,
          },
        ],
        secondaryFields: [
          {
            key: 'date',
            label: 'DATE',
            value: eventDate,
            dateStyle: 'PKDateStyleMedium',
          },
          {
            key: 'time',
            label: 'HEURE',
            value: eventTime,
          },
        ],
        auxiliaryFields: [
          {
            key: 'holder',
            label: 'PARTICIPANT',
            value: holderName,
          },
          {
            key: 'venue',
            label: 'LIEU',
            value: venue,
          },
        ],
        backFields: [
          {
            key: 'ticketId',
            label: 'Reference du billet',
            value: ticketId,
          },
          {
            key: 'terms',
            label: 'Conditions',
            value: 'Ce billet est personnel et non cessible. Presentez ce pass a l\'entree pour validation. En cas de perte, contactez le service client.',
          },
          ...additionalFields,
        ],
      },
      locations,
      semantics: {
        eventName: festivalName,
        eventType: 'PKEventTypeLivePerformance',
        venueName: venue,
      },
    };
  }

  /**
   * Get pass colors based on ticket type
   */
  public getPassColors(ticketType: string): {
    backgroundColor: string;
    foregroundColor: string;
    labelColor: string;
  } {
    const colorSchemes: Record<string, { backgroundColor: string; foregroundColor: string; labelColor: string }> = {
      vip: {
        backgroundColor: 'rgb(212, 175, 55)',
        foregroundColor: 'rgb(0, 0, 0)',
        labelColor: 'rgb(50, 50, 50)',
      },
      premium: {
        backgroundColor: 'rgb(128, 0, 128)',
        foregroundColor: 'rgb(255, 255, 255)',
        labelColor: 'rgb(220, 180, 255)',
      },
      backstage: {
        backgroundColor: 'rgb(0, 0, 0)',
        foregroundColor: 'rgb(255, 255, 255)',
        labelColor: 'rgb(180, 180, 180)',
      },
      general: {
        backgroundColor: 'rgb(96, 59, 255)',
        foregroundColor: 'rgb(255, 255, 255)',
        labelColor: 'rgb(200, 200, 255)',
      },
      early_bird: {
        backgroundColor: 'rgb(255, 140, 0)',
        foregroundColor: 'rgb(255, 255, 255)',
        labelColor: 'rgb(255, 220, 180)',
      },
      student: {
        backgroundColor: 'rgb(0, 128, 0)',
        foregroundColor: 'rgb(255, 255, 255)',
        labelColor: 'rgb(180, 255, 180)',
      },
    };

    return colorSchemes[ticketType.toLowerCase()] || colorSchemes.general;
  }
}

export default AppleWalletService;
