/**
 * NFC Manager Service
 * Main service for NFC operations on the Festival platform
 * Supports iOS (Core NFC) and Android native NFC
 */

import NfcManager, { NfcTech, Ndef, NfcEvents, TagEvent } from 'react-native-nfc-manager';
import { Platform, Vibration } from 'react-native';
import { NFCReader } from './NFCReader';
import { NFCWriter } from './NFCWriter';
import { NFCFormatter } from './NFCFormatter';

// NFC Status Types
export type NFCStatus = 'unavailable' | 'disabled' | 'ready' | 'scanning' | 'error';

// NFC Error Types
export enum NFCErrorCode {
  NOT_SUPPORTED = 'NFC_NOT_SUPPORTED',
  NOT_ENABLED = 'NFC_NOT_ENABLED',
  TAG_NOT_FOUND = 'TAG_NOT_FOUND',
  READ_ERROR = 'READ_ERROR',
  WRITE_ERROR = 'WRITE_ERROR',
  INVALID_TAG = 'INVALID_TAG',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  USER_CANCELLED = 'USER_CANCELLED',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN_ERROR',
}

export class NFCError extends Error {
  code: NFCErrorCode;

  constructor(code: NFCErrorCode, message?: string) {
    super(message || code);
    this.code = code;
    this.name = 'NFCError';
  }
}

// NFC Event Listeners
export interface NFCEventListener {
  onTagDiscovered?: (tag: TagEvent) => void;
  onSessionStarted?: () => void;
  onSessionClosed?: () => void;
  onError?: (error: NFCError) => void;
}

// NFC Manager Configuration
export interface NFCManagerConfig {
  enableVibration?: boolean;
  enableSound?: boolean;
  sessionTimeout?: number;
  alertMessage?: string;
}

const DEFAULT_CONFIG: NFCManagerConfig = {
  enableVibration: true,
  enableSound: true,
  sessionTimeout: 30000,
  alertMessage: 'Approchez votre bracelet NFC',
};

class NFCManagerService {
  private static instance: NFCManagerService;
  private isInitialized = false;
  private isSupported = false;
  private isEnabled = false;
  private currentStatus: NFCStatus = 'unavailable';
  private config: NFCManagerConfig = DEFAULT_CONFIG;
  private listeners = new Set<NFCEventListener>();

  public reader: NFCReader;
  public writer: NFCWriter;
  public formatter: NFCFormatter;

  private constructor() {
    this.reader = new NFCReader(this);
    this.writer = new NFCWriter(this);
    this.formatter = new NFCFormatter();
  }

  static getInstance(): NFCManagerService {
    if (!NFCManagerService.instance) {
      NFCManagerService.instance = new NFCManagerService();
    }
    return NFCManagerService.instance;
  }

  /**
   * Initialize NFC Manager
   */
  async initialize(config?: Partial<NFCManagerConfig>): Promise<boolean> {
    if (this.isInitialized) {
      return this.isSupported;
    }

    this.config = { ...DEFAULT_CONFIG, ...config };

    try {
      // Check if NFC is supported
      this.isSupported = await NfcManager.isSupported();

      if (!this.isSupported) {
        this.currentStatus = 'unavailable';
        console.log('[NFCManager] NFC not supported on this device');
        return false;
      }

      // Start NFC Manager
      await NfcManager.start();

      // Check if NFC is enabled
      this.isEnabled = await this.checkNFCEnabled();

      this.currentStatus = this.isEnabled ? 'ready' : 'disabled';
      this.isInitialized = true;

      // Setup event listeners
      this.setupEventListeners();

      console.log('[NFCManager] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[NFCManager] Initialization error:', error);
      this.currentStatus = 'error';
      throw new NFCError(NFCErrorCode.NOT_SUPPORTED, 'Failed to initialize NFC');
    }
  }

  /**
   * Check if NFC is enabled on the device
   */
  async checkNFCEnabled(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        return await NfcManager.isEnabled();
      }
      // iOS doesn't have a way to check if NFC is enabled
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Setup NFC event listeners
   */
  private setupEventListeners(): void {
    NfcManager.setEventListener(NfcEvents.DiscoverTag, (tag: TagEvent) => {
      this.handleTagDiscovered(tag);
    });

    NfcManager.setEventListener(NfcEvents.SessionClosed, () => {
      this.handleSessionClosed();
    });
  }

  /**
   * Handle tag discovered event
   */
  private handleTagDiscovered(tag: TagEvent): void {
    if (this.config.enableVibration) {
      Vibration.vibrate(100);
    }

    this.listeners.forEach(listener => {
      listener.onTagDiscovered?.(tag);
    });
  }

  /**
   * Handle session closed event
   */
  private handleSessionClosed(): void {
    this.currentStatus = this.isEnabled ? 'ready' : 'disabled';

    this.listeners.forEach(listener => {
      listener.onSessionClosed?.();
    });
  }

  /**
   * Start NFC scanning session
   */
  async startSession(tech: NfcTech[] = [NfcTech.Ndef]): Promise<void> {
    if (!this.isSupported) {
      throw new NFCError(NFCErrorCode.NOT_SUPPORTED, 'NFC is not supported');
    }

    if (!this.isEnabled) {
      throw new NFCError(NFCErrorCode.NOT_ENABLED, 'NFC is not enabled');
    }

    try {
      this.currentStatus = 'scanning';

      this.listeners.forEach(listener => {
        listener.onSessionStarted?.();
      });

      if (Platform.OS === 'ios') {
        await NfcManager.requestTechnology(tech, {
          alertMessage: this.config.alertMessage,
        });
      } else {
        await NfcManager.requestTechnology(tech);
      }
    } catch (error: unknown) {
      this.currentStatus = 'error';
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('cancelled') || errorMessage.includes('cancel')) {
        throw new NFCError(NFCErrorCode.USER_CANCELLED, 'NFC session cancelled by user');
      }

      throw new NFCError(NFCErrorCode.UNKNOWN, `Failed to start NFC session: ${errorMessage}`);
    }
  }

  /**
   * Stop current NFC session
   */
  async stopSession(): Promise<void> {
    try {
      await NfcManager.cancelTechnologyRequest();
      this.currentStatus = this.isEnabled ? 'ready' : 'disabled';
    } catch (error) {
      console.warn('[NFCManager] Error stopping session:', error);
    }
  }

  /**
   * Clean up NFC session resources
   */
  async cleanUp(): Promise<void> {
    try {
      await NfcManager.cancelTechnologyRequest();
    } catch {
      // Ignore cleanup errors
    }
  }

  /**
   * Open device NFC settings (Android only)
   */
  async openNFCSettings(): Promise<void> {
    if (Platform.OS === 'android') {
      await NfcManager.goToNfcSetting();
    }
  }

  /**
   * Get current NFC status
   */
  getStatus(): NFCStatus {
    return this.currentStatus;
  }

  /**
   * Check if NFC is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.isSupported && this.isEnabled;
  }

  /**
   * Check if NFC is supported
   */
  isNFCSupported(): boolean {
    return this.isSupported;
  }

  /**
   * Check if NFC is currently enabled
   */
  isNFCEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Add event listener
   */
  addListener(listener: NFCEventListener): () => void {
    this.listeners.add(listener);
    return () => this.removeListener(listener);
  }

  /**
   * Remove event listener
   */
  removeListener(listener: NFCEventListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Get platform specific info
   */
  getPlatformInfo(): { platform: string; nfcType: string } {
    return {
      platform: Platform.OS,
      nfcType: Platform.OS === 'ios' ? 'Core NFC' : 'Android NFC',
    };
  }

  /**
   * Provide haptic feedback
   */
  provideFeedback(type: 'success' | 'error' | 'warning' = 'success'): void {
    if (!this.config.enableVibration) {return;}

    switch (type) {
      case 'success':
        Vibration.vibrate([0, 50, 50, 50]);
        break;
      case 'error':
        Vibration.vibrate([0, 100, 100, 100, 100, 100]);
        break;
      case 'warning':
        Vibration.vibrate([0, 75, 75, 75]);
        break;
    }
  }
}

// Export singleton instance
export const nfcManager = NFCManagerService.getInstance();
export default nfcManager;
