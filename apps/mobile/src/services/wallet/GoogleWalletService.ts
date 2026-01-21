/**
 * GoogleWalletService - Google Wallet Integration
 * Handles JWT-based pass generation and wallet interactions
 */

import { NativeModules, Platform, Linking } from 'react-native';

// ============================================================================
// Types
// ============================================================================

export interface GoogleWalletConfig {
  issuerId: string;
  serviceAccountEmail?: string;
}

export interface GoogleWalletAvailability {
  isAvailable: boolean;
  canAddPasses: boolean;
  reason?: string;
}

export interface GooglePassResult {
  success: boolean;
  error?: string;
  passId?: string;
}

export interface GoogleEventTicketClass {
  id: string;
  issuerId: string;
  issuerName: string;
  reviewStatus: 'UNDER_REVIEW' | 'APPROVED' | 'DRAFT';
  eventName: LocalizedString;
  venue: EventVenue;
  dateTime: EventDateTime;
  logo?: Image;
  heroImage?: Image;
  hexBackgroundColor?: string;
  localizedIssuerName?: LocalizedString;
  multipleDevicesAndHoldersAllowedStatus?:
    | 'STATUS_UNSPECIFIED'
    | 'MULTIPLE_HOLDERS'
    | 'ONE_USER_ALL_DEVICES'
    | 'ONE_USER_ONE_DEVICE';
  callbackOptions?: CallbackOptions;
  securityAnimation?: SecurityAnimation;
  viewUnlockRequirement?:
    | 'VIEW_UNLOCK_REQUIREMENT_UNSPECIFIED'
    | 'UNLOCK_NOT_REQUIRED'
    | 'UNLOCK_REQUIRED_TO_VIEW';
  linksModuleData?: LinksModuleData;
  infoModuleData?: InfoModuleData;
  classTemplateInfo?: ClassTemplateInfo;
}

export interface GoogleEventTicketObject {
  id: string;
  classId: string;
  state: 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'INACTIVE';
  ticketHolderName: string;
  ticketNumber: string;
  ticketType?: LocalizedString;
  seatInfo?: SeatInfo;
  reservationInfo?: ReservationInfo;
  barcode: Barcode;
  validTimeInterval?: TimeInterval;
  locations?: LatLongPoint[];
  heroImage?: Image;
  hexBackgroundColor?: string;
  groupingInfo?: GroupingInfo;
  linkedOfferIds?: string[];
  textModulesData?: TextModuleData[];
  linksModuleData?: LinksModuleData;
  imageModulesData?: ImageModuleData[];
  messages?: Message[];
  passConstraints?: PassConstraints;
  rotatingBarcode?: RotatingBarcode;
  faceValue?: Money;
  notifications?: Notifications;
}

export interface LocalizedString {
  defaultValue: TranslatedString;
  translatedValues?: TranslatedString[];
}

export interface TranslatedString {
  language: string;
  value: string;
}

export interface EventVenue {
  name: LocalizedString;
  address: LocalizedString;
}

export interface EventDateTime {
  start: string; // ISO 8601 format
  end?: string;
  doorsOpen?: string;
  customDoorsOpenLabel?: LocalizedString;
}

export interface Image {
  sourceUri: ImageUri;
  contentDescription?: LocalizedString;
}

export interface ImageUri {
  uri: string;
  description?: string;
}

export interface CallbackOptions {
  url: string;
  updateRequestUrl?: string;
}

export interface SecurityAnimation {
  animationType: 'ANIMATION_UNSPECIFIED' | 'FOIL_SHIMMER';
}

export interface LinksModuleData {
  uris?: Uri[];
}

export interface Uri {
  uri: string;
  description?: string;
  localizedDescription?: LocalizedString;
  id?: string;
}

export interface InfoModuleData {
  labelValueRows?: LabelValueRow[];
  showLastUpdateTime?: boolean;
}

export interface LabelValueRow {
  columns: LabelValue[];
}

export interface LabelValue {
  label: string;
  value: string;
  localizedLabel?: LocalizedString;
  localizedValue?: LocalizedString;
}

export interface ClassTemplateInfo {
  cardTemplateOverride?: CardTemplateOverride;
  detailsTemplateOverride?: DetailsTemplateOverride;
}

export interface CardTemplateOverride {
  cardRowTemplateInfos?: CardRowTemplateInfo[];
}

export interface DetailsTemplateOverride {
  detailsItemInfos?: DetailsItemInfo[];
}

export interface CardRowTemplateInfo {
  oneItem?: TemplateItem;
  twoItems?: TwoItems;
  threeItems?: ThreeItems;
}

export interface TemplateItem {
  item: FieldSelector;
}

export interface TwoItems {
  startItem: TemplateItem;
  endItem: TemplateItem;
}

export interface ThreeItems {
  startItem: TemplateItem;
  middleItem: TemplateItem;
  endItem: TemplateItem;
}

export interface FieldSelector {
  fields: FieldReference[];
}

export interface FieldReference {
  fieldPath: string;
  dateFormat?: string;
}

export interface DetailsItemInfo {
  item: TemplateItem;
}

export interface SeatInfo {
  seat?: LocalizedString;
  row?: LocalizedString;
  section?: LocalizedString;
  gate?: LocalizedString;
}

export interface ReservationInfo {
  confirmationCode?: string;
  frequentFlyerInfo?: FrequentFlyerInfo;
}

export interface FrequentFlyerInfo {
  frequentFlyerProgramName?: LocalizedString;
  frequentFlyerNumber?: string;
}

export interface Barcode {
  type:
    | 'QR_CODE'
    | 'AZTEC'
    | 'CODE_128'
    | 'CODE_39'
    | 'CODABAR'
    | 'DATA_MATRIX'
    | 'EAN_13'
    | 'EAN_8'
    | 'ITF_14'
    | 'PDF_417'
    | 'TEXT_ONLY'
    | 'UPC_A';
  value: string;
  alternateText?: string;
  showCodeText?: LocalizedString;
}

export interface TimeInterval {
  start: DateTime;
  end: DateTime;
}

export interface DateTime {
  date: string; // ISO 8601 format
}

export interface LatLongPoint {
  latitude: number;
  longitude: number;
}

export interface GroupingInfo {
  sortIndex?: number;
  groupingId?: string;
}

export interface TextModuleData {
  header?: string;
  body: string;
  localizedHeader?: LocalizedString;
  localizedBody?: LocalizedString;
  id?: string;
}

export interface ImageModuleData {
  mainImage: Image;
  id?: string;
}

export interface Message {
  header?: string;
  body: string;
  displayInterval?: TimeInterval;
  id?: string;
  messageType?: 'TEXT' | 'EXPIRATION_NOTIFICATION';
  localizedHeader?: LocalizedString;
  localizedBody?: LocalizedString;
}

export interface PassConstraints {
  screenshotEligibility?: 'SCREENSHOT_ELIGIBILITY_UNSPECIFIED' | 'ELIGIBLE' | 'INELIGIBLE';
  nfcConstraint?: NfcConstraint[];
}

export interface NfcConstraint {
  constraint: 'NFC_CONSTRAINT_UNSPECIFIED' | 'BLOCK_PAYMENT' | 'BLOCK_CLOSED_LOOP_TRANSIT';
}

export interface RotatingBarcode {
  type: 'QR_CODE' | 'PDF_417';
  valuePattern: string;
  totpDetails?: TotpDetails;
  alternateText?: string;
  showCodeText?: LocalizedString;
}

export interface TotpDetails {
  periodMillis: string;
  algorithm: 'TOTP_ALGORITHM_UNSPECIFIED' | 'TOTP_SHA1';
  parameters: TotpParameters[];
}

export interface TotpParameters {
  key: string;
  valueLength: number;
}

export interface Money {
  micros: string;
  currencyCode: string;
}

export interface Notifications {
  expiryNotification?: ExpiryNotification;
  upcomingNotification?: UpcomingNotification;
}

export interface ExpiryNotification {
  enableNotification: boolean;
}

export interface UpcomingNotification {
  enableNotification: boolean;
}

// ============================================================================
// Native Module Interface
// ============================================================================

interface GoogleWalletNativeModule {
  isGoogleWalletAvailable(): Promise<boolean>;
  savePass(jwt: string): Promise<{ success: boolean; error?: string }>;
  openGoogleWallet(): Promise<void>;
}

// Get native module (will be undefined if not implemented)
const GoogleWalletModule = NativeModules.GoogleWallet as GoogleWalletNativeModule | undefined;

// ============================================================================
// GoogleWalletService Class
// ============================================================================

export class GoogleWalletService {
  private config: GoogleWalletConfig | null = null;
  private initialized = false;
  private savedPasses = new Set<string>();

  /**
   * Initialize the Google Wallet service
   */
  public async initialize(config: GoogleWalletConfig): Promise<void> {
    if (Platform.OS !== 'android') {
      throw new Error('GoogleWalletService is only available on Android');
    }

    this.config = config;
    this.initialized = true;
  }

  /**
   * Check Google Wallet availability
   */
  public async checkAvailability(): Promise<GoogleWalletAvailability> {
    if (Platform.OS !== 'android') {
      return {
        isAvailable: false,
        canAddPasses: false,
        reason: 'Google Wallet is only available on Android',
      };
    }

    try {
      if (GoogleWalletModule) {
        const isAvailable = await GoogleWalletModule.isGoogleWalletAvailable();
        return {
          isAvailable,
          canAddPasses: isAvailable,
          reason: isAvailable ? undefined : 'Google Wallet not installed',
        };
      }

      // Fallback: Try to check if Google Wallet URL can be opened
      const googleWalletUrl = 'https://pay.google.com/gp/v/save/';
      const canOpen = await Linking.canOpenURL(googleWalletUrl);
      return {
        isAvailable: canOpen,
        canAddPasses: canOpen,
        reason: canOpen ? undefined : 'Cannot open Google Wallet',
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
   * Check if a specific pass is already saved
   */
  public async isPassAdded(ticketId: string): Promise<boolean> {
    // Google Wallet doesn't have a native API to check saved passes
    // We maintain local state for UI purposes
    return this.savedPasses.has(ticketId);
  }

  /**
   * Add pass to Google Wallet
   */
  public async addPass(saveUrl: string): Promise<GooglePassResult> {
    if (Platform.OS !== 'android') {
      return {
        success: false,
        error: 'Google Wallet is only available on Android',
      };
    }

    try {
      if (GoogleWalletModule) {
        // Use native module
        const result = await GoogleWalletModule.savePass(saveUrl);
        if (result.success) {
          // Extract ticket ID from URL if possible
          const ticketId = this.extractTicketIdFromUrl(saveUrl);
          if (ticketId) {
            this.savedPasses.add(ticketId);
          }
        }
        return result;
      }

      // Fallback: Open URL directly
      const canOpen = await Linking.canOpenURL(saveUrl);
      if (canOpen) {
        await Linking.openURL(saveUrl);
        return { success: true };
      }

      return {
        success: false,
        error: 'Cannot open Google Wallet save URL',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add pass',
      };
    }
  }

  /**
   * Open Google Wallet app
   */
  public async openWallet(): Promise<void> {
    try {
      if (GoogleWalletModule) {
        await GoogleWalletModule.openGoogleWallet();
        return;
      }

      // Fallback: Try opening Google Wallet URL
      const walletUrl = 'https://pay.google.com/gp/w/u/0/home/passes';
      const canOpen = await Linking.canOpenURL(walletUrl);
      if (canOpen) {
        await Linking.openURL(walletUrl);
      }
    } catch (error) {
      console.error('Error opening Google Wallet:', error);
    }
  }

  /**
   * Remove pass (mark as removed locally)
   */
  public async removePass(ticketId: string): Promise<boolean> {
    // Google Wallet doesn't support programmatic removal
    // Just update local state
    this.savedPasses.delete(ticketId);
    return true;
  }

  /**
   * Generate Google Event Ticket Class (for preview/reference)
   */
  public generateTicketClass(
    classId: string,
    festivalName: string,
    venue: string,
    venueAddress: string,
    startDate: string,
    endDate: string,
    options: {
      heroImageUrl?: string;
      logoImageUrl?: string;
      hexBackgroundColor?: string;
      doorsOpenTime?: string;
    } = {}
  ): GoogleEventTicketClass {
    if (!this.config) {
      throw new Error('GoogleWalletService not initialized');
    }

    const { heroImageUrl, logoImageUrl, hexBackgroundColor = '#603BFF', doorsOpenTime } = options;

    const ticketClass: GoogleEventTicketClass = {
      id: `${this.config.issuerId}.${classId}`,
      issuerId: this.config.issuerId,
      issuerName: festivalName,
      reviewStatus: 'APPROVED',
      eventName: {
        defaultValue: {
          language: 'fr',
          value: festivalName,
        },
      },
      venue: {
        name: {
          defaultValue: {
            language: 'fr',
            value: venue,
          },
        },
        address: {
          defaultValue: {
            language: 'fr',
            value: venueAddress,
          },
        },
      },
      dateTime: {
        start: startDate,
        end: endDate,
        doorsOpen: doorsOpenTime,
      },
      hexBackgroundColor,
      multipleDevicesAndHoldersAllowedStatus: 'ONE_USER_ALL_DEVICES',
      securityAnimation: {
        animationType: 'FOIL_SHIMMER',
      },
      viewUnlockRequirement: 'UNLOCK_NOT_REQUIRED',
    };

    if (heroImageUrl) {
      ticketClass.heroImage = {
        sourceUri: { uri: heroImageUrl },
        contentDescription: {
          defaultValue: {
            language: 'fr',
            value: festivalName,
          },
        },
      };
    }

    if (logoImageUrl) {
      ticketClass.logo = {
        sourceUri: { uri: logoImageUrl },
        contentDescription: {
          defaultValue: {
            language: 'fr',
            value: `Logo ${festivalName}`,
          },
        },
      };
    }

    return ticketClass;
  }

  /**
   * Generate Google Event Ticket Object (for preview/reference)
   */
  public generateTicketObject(
    objectId: string,
    classId: string,
    ticketId: string,
    holderName: string,
    ticketType: string,
    qrCode: string,
    options: {
      seat?: string;
      row?: string;
      section?: string;
      gate?: string;
      confirmationCode?: string;
      validFrom?: string;
      validUntil?: string;
      heroImageUrl?: string;
      hexBackgroundColor?: string;
    } = {}
  ): GoogleEventTicketObject {
    if (!this.config) {
      throw new Error('GoogleWalletService not initialized');
    }

    const {
      seat,
      row,
      section,
      gate,
      confirmationCode,
      validFrom,
      validUntil,
      heroImageUrl,
      hexBackgroundColor,
    } = options;

    const ticketObject: GoogleEventTicketObject = {
      id: `${this.config.issuerId}.${objectId}`,
      classId: `${this.config.issuerId}.${classId}`,
      state: 'ACTIVE',
      ticketHolderName: holderName,
      ticketNumber: ticketId,
      ticketType: {
        defaultValue: {
          language: 'fr',
          value: ticketType,
        },
      },
      barcode: {
        type: 'QR_CODE',
        value: qrCode,
        alternateText: ticketId,
      },
      textModulesData: [
        {
          header: 'Reference',
          body: ticketId,
        },
      ],
    };

    // Add seat info if provided
    if (seat || row || section || gate) {
      ticketObject.seatInfo = {};
      if (seat) {
        ticketObject.seatInfo.seat = {
          defaultValue: { language: 'fr', value: seat },
        };
      }
      if (row) {
        ticketObject.seatInfo.row = {
          defaultValue: { language: 'fr', value: row },
        };
      }
      if (section) {
        ticketObject.seatInfo.section = {
          defaultValue: { language: 'fr', value: section },
        };
      }
      if (gate) {
        ticketObject.seatInfo.gate = {
          defaultValue: { language: 'fr', value: gate },
        };
      }
    }

    // Add reservation info if provided
    if (confirmationCode) {
      ticketObject.reservationInfo = {
        confirmationCode,
      };
    }

    // Add valid time interval if provided
    if (validFrom && validUntil) {
      ticketObject.validTimeInterval = {
        start: { date: validFrom },
        end: { date: validUntil },
      };
    }

    // Add hero image if provided
    if (heroImageUrl) {
      ticketObject.heroImage = {
        sourceUri: { uri: heroImageUrl },
      };
    }

    // Add background color if provided
    if (hexBackgroundColor) {
      ticketObject.hexBackgroundColor = hexBackgroundColor;
    }

    return ticketObject;
  }

  /**
   * Get pass colors based on ticket type
   */
  public getPassColors(ticketType: string): string {
    const colorSchemes: Record<string, string> = {
      vip: '#D4AF37',
      premium: '#800080',
      backstage: '#000000',
      general: '#603BFF',
      early_bird: '#FF8C00',
      student: '#008000',
    };

    return colorSchemes[ticketType.toLowerCase()] || colorSchemes.general;
  }

  /**
   * Extract ticket ID from save URL
   */
  private extractTicketIdFromUrl(url: string): string | null {
    try {
      // Try to extract from JWT payload or URL parameter
      const match = url.match(/\/([^/]+)$/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }
}

export default GoogleWalletService;
