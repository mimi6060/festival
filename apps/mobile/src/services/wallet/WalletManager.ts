/**
 * WalletManager - Unified Wallet Service Manager
 * Handles both Apple Wallet and Google Wallet integration
 */

import { Platform } from 'react-native';
import { AppleWalletService, AppleWalletAvailability } from './AppleWalletService';
import { GoogleWalletService, GoogleWalletAvailability } from './GoogleWalletService';
import { PassGenerator, PassData, GeneratedPass } from './PassGenerator';

// ============================================================================
// Types
// ============================================================================

export type WalletType = 'apple' | 'google' | 'none';

export interface WalletAvailability {
  isAvailable: boolean;
  walletType: WalletType;
  canAddPasses: boolean;
  reason?: string;
}

export interface AddToWalletResult {
  success: boolean;
  walletType: WalletType;
  passUrl?: string;
  error?: string;
}

export interface WalletPassInfo {
  ticketId: string;
  festivalId: string;
  festivalName: string;
  festivalLogo?: string;
  festivalBannerColor?: string;
  ticketType: string;
  ticketTypeName: string;
  holderName: string;
  eventDate: string;
  eventTime?: string;
  venue: string;
  venueAddress?: string;
  qrCode: string;
  ticketNumber: string;
  validFrom: string;
  validUntil: string;
  zoneAccess: string[];
  price?: number;
  currency?: string;
  seatInfo?: string;
  additionalInfo?: Record<string, string>;
}

export interface WalletConfig {
  // Apple Wallet Config
  apple?: {
    passTypeIdentifier: string;
    teamIdentifier: string;
    organizationName: string;
    webServiceURL?: string;
    authenticationToken?: string;
  };
  // Google Wallet Config
  google?: {
    issuerId: string;
    serviceAccountEmail?: string;
  };
  // API endpoint for pass generation
  apiBaseUrl: string;
}

// ============================================================================
// WalletManager Class
// ============================================================================

export class WalletManager {
  private static instance: WalletManager;
  private appleWalletService: AppleWalletService;
  private googleWalletService: GoogleWalletService;
  private passGenerator: PassGenerator;
  private config: WalletConfig;
  private initialized = false;

  private constructor() {
    this.appleWalletService = new AppleWalletService();
    this.googleWalletService = new GoogleWalletService();
    this.passGenerator = new PassGenerator();
    this.config = {
      apiBaseUrl: '',
    };
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): WalletManager {
    if (!WalletManager.instance) {
      WalletManager.instance = new WalletManager();
    }
    return WalletManager.instance;
  }

  /**
   * Initialize wallet manager with configuration
   */
  public async initialize(config: WalletConfig): Promise<void> {
    this.config = config;

    if (Platform.OS === 'ios' && config.apple) {
      await this.appleWalletService.initialize({
        passTypeIdentifier: config.apple.passTypeIdentifier,
        teamIdentifier: config.apple.teamIdentifier,
        organizationName: config.apple.organizationName,
        webServiceURL: config.apple.webServiceURL,
        authenticationToken: config.apple.authenticationToken,
      });
    }

    if (Platform.OS === 'android' && config.google) {
      await this.googleWalletService.initialize({
        issuerId: config.google.issuerId,
        serviceAccountEmail: config.google.serviceAccountEmail,
      });
    }

    this.initialized = true;
  }

  /**
   * Check wallet availability
   */
  public async checkAvailability(): Promise<WalletAvailability> {
    if (!this.initialized) {
      return {
        isAvailable: false,
        walletType: 'none',
        canAddPasses: false,
        reason: 'WalletManager not initialized',
      };
    }

    if (Platform.OS === 'ios') {
      const appleAvailability = await this.appleWalletService.checkAvailability();
      return {
        isAvailable: appleAvailability.isAvailable,
        walletType: appleAvailability.isAvailable ? 'apple' : 'none',
        canAddPasses: appleAvailability.canAddPasses,
        reason: appleAvailability.reason,
      };
    }

    if (Platform.OS === 'android') {
      const googleAvailability = await this.googleWalletService.checkAvailability();
      return {
        isAvailable: googleAvailability.isAvailable,
        walletType: googleAvailability.isAvailable ? 'google' : 'none',
        canAddPasses: googleAvailability.canAddPasses,
        reason: googleAvailability.reason,
      };
    }

    return {
      isAvailable: false,
      walletType: 'none',
      canAddPasses: false,
      reason: 'Unsupported platform',
    };
  }

  /**
   * Get preferred wallet type for current platform
   */
  public getPreferredWalletType(): WalletType {
    if (Platform.OS === 'ios') {return 'apple';}
    if (Platform.OS === 'android') {return 'google';}
    return 'none';
  }

  /**
   * Add ticket to wallet
   */
  public async addToWallet(passInfo: WalletPassInfo): Promise<AddToWalletResult> {
    const availability = await this.checkAvailability();

    if (!availability.isAvailable || !availability.canAddPasses) {
      return {
        success: false,
        walletType: 'none',
        error: availability.reason || 'Wallet not available',
      };
    }

    try {
      // Generate pass data
      const passData = this.passGenerator.generatePassData(passInfo);

      if (Platform.OS === 'ios') {
        return await this.addToAppleWallet(passInfo, passData);
      }

      if (Platform.OS === 'android') {
        return await this.addToGoogleWallet(passInfo, passData);
      }

      return {
        success: false,
        walletType: 'none',
        error: 'Unsupported platform',
      };
    } catch (error) {
      return {
        success: false,
        walletType: this.getPreferredWalletType(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Add pass to Apple Wallet
   */
  private async addToAppleWallet(
    passInfo: WalletPassInfo,
    passData: PassData
  ): Promise<AddToWalletResult> {
    try {
      // Request .pkpass file from backend
      const passUrl = await this.fetchApplePassUrl(passInfo.ticketId);

      if (!passUrl) {
        return {
          success: false,
          walletType: 'apple',
          error: 'Failed to generate Apple Wallet pass',
        };
      }

      // Add to Apple Wallet
      const result = await this.appleWalletService.addPass(passUrl);

      return {
        success: result.success,
        walletType: 'apple',
        passUrl: passUrl,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        walletType: 'apple',
        error: error instanceof Error ? error.message : 'Failed to add to Apple Wallet',
      };
    }
  }

  /**
   * Add pass to Google Wallet
   */
  private async addToGoogleWallet(
    passInfo: WalletPassInfo,
    passData: PassData
  ): Promise<AddToWalletResult> {
    try {
      // Request JWT from backend
      const saveUrl = await this.fetchGoogleWalletUrl(passInfo.ticketId);

      if (!saveUrl) {
        return {
          success: false,
          walletType: 'google',
          error: 'Failed to generate Google Wallet pass',
        };
      }

      // Add to Google Wallet
      const result = await this.googleWalletService.addPass(saveUrl);

      return {
        success: result.success,
        walletType: 'google',
        passUrl: saveUrl,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        walletType: 'google',
        error: error instanceof Error ? error.message : 'Failed to add to Google Wallet',
      };
    }
  }

  /**
   * Fetch Apple Wallet pass URL from backend
   */
  private async fetchApplePassUrl(ticketId: string): Promise<string | null> {
    try {
      const response = await fetch(
        `${this.config.apiBaseUrl}/wallet/apple/pass/${ticketId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.passUrl;
    } catch (error) {
      console.error('Error fetching Apple pass URL:', error);
      return null;
    }
  }

  /**
   * Fetch Google Wallet save URL from backend
   */
  private async fetchGoogleWalletUrl(ticketId: string): Promise<string | null> {
    try {
      const response = await fetch(
        `${this.config.apiBaseUrl}/wallet/google/pass/${ticketId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.saveUrl;
    } catch (error) {
      console.error('Error fetching Google Wallet URL:', error);
      return null;
    }
  }

  /**
   * Check if a pass already exists in wallet
   */
  public async isPassInWallet(ticketId: string): Promise<boolean> {
    if (Platform.OS === 'ios') {
      return await this.appleWalletService.isPassAdded(ticketId);
    }
    if (Platform.OS === 'android') {
      return await this.googleWalletService.isPassAdded(ticketId);
    }
    return false;
  }

  /**
   * Remove pass from wallet (if supported)
   */
  public async removeFromWallet(ticketId: string): Promise<boolean> {
    if (Platform.OS === 'ios') {
      return await this.appleWalletService.removePass(ticketId);
    }
    // Google Wallet doesn't support programmatic removal
    return false;
  }

  /**
   * Open wallet app
   */
  public async openWalletApp(): Promise<void> {
    if (Platform.OS === 'ios') {
      await this.appleWalletService.openWallet();
    } else if (Platform.OS === 'android') {
      await this.googleWalletService.openWallet();
    }
  }

  /**
   * Get pass update status
   */
  public async getPassUpdateStatus(ticketId: string): Promise<{
    needsUpdate: boolean;
    lastUpdated?: string;
  }> {
    try {
      const response = await fetch(
        `${this.config.apiBaseUrl}/wallet/pass/${ticketId}/status`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting pass update status:', error);
      return { needsUpdate: false };
    }
  }

  /**
   * Request pass update
   */
  public async requestPassUpdate(ticketId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.config.apiBaseUrl}/wallet/pass/${ticketId}/update`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Error requesting pass update:', error);
      return false;
    }
  }
}

// Export singleton instance
export const walletManager = WalletManager.getInstance();

export default WalletManager;
