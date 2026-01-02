/**
 * NFC Reader Service
 * Handles reading NFC tags for the Festival cashless system
 */

import NfcManager, { NfcTech, Ndef, TagEvent } from 'react-native-nfc-manager';
import { NFCFormatter, NFCTagData, NFCPayload, CashlessData } from './NFCFormatter';
import { NFCError, NFCErrorCode } from './NFCManager';
import type NFCManagerService from './NFCManager';

// Read result interface
export interface NFCReadResult {
  success: boolean;
  tagId: string | null;
  data: NFCTagData | null;
  rawPayload: string | null;
  error?: NFCError;
}

// Read options
export interface NFCReadOptions {
  timeout?: number;
  validateSignature?: boolean;
  decryptData?: boolean;
}

const DEFAULT_READ_OPTIONS: NFCReadOptions = {
  timeout: 30000,
  validateSignature: true,
  decryptData: true,
};

export class NFCReader {
  private manager: NFCManagerService;
  private formatter: NFCFormatter;

  constructor(manager: NFCManagerService) {
    this.manager = manager;
    this.formatter = new NFCFormatter();
  }

  /**
   * Read NFC tag with automatic session management
   */
  async readTag(options: NFCReadOptions = {}): Promise<NFCReadResult> {
    const opts = { ...DEFAULT_READ_OPTIONS, ...options };

    try {
      // Start NFC session
      await this.manager.startSession([NfcTech.Ndef]);

      // Get tag
      const tag = await NfcManager.getTag();

      if (!tag) {
        throw new NFCError(NFCErrorCode.TAG_NOT_FOUND, 'No NFC tag found');
      }

      // Extract tag ID
      const tagId = this.extractTagId(tag);

      // Read NDEF data
      const ndefData = await this.readNdefData(tag);

      // Parse and validate data
      let parsedData: NFCTagData | null = null;
      let rawPayload: string | null = null;

      if (ndefData) {
        rawPayload = ndefData;

        try {
          const payload = this.formatter.parsePayload(ndefData);

          if (opts.validateSignature && !this.formatter.verifySignature(payload)) {
            throw new NFCError(NFCErrorCode.AUTHENTICATION_FAILED, 'Invalid tag signature');
          }

          parsedData = this.formatter.decodeTagData(payload, opts.decryptData);
        } catch (parseError) {
          if (parseError instanceof NFCError) {
            throw parseError;
          }
          // Data might not be in our format, return raw
          console.warn('[NFCReader] Unable to parse tag data:', parseError);
        }
      }

      this.manager.provideFeedback('success');

      return {
        success: true,
        tagId,
        data: parsedData,
        rawPayload,
      };
    } catch (error) {
      this.manager.provideFeedback('error');

      if (error instanceof NFCError) {
        return {
          success: false,
          tagId: null,
          data: null,
          rawPayload: null,
          error,
        };
      }

      return {
        success: false,
        tagId: null,
        data: null,
        rawPayload: null,
        error: new NFCError(NFCErrorCode.READ_ERROR, `Read failed: ${error}`),
      };
    } finally {
      await this.manager.cleanUp();
    }
  }

  /**
   * Read cashless bracelet data
   */
  async readCashlessBracelet(options: NFCReadOptions = {}): Promise<{
    success: boolean;
    braceletId: string | null;
    cashlessData: CashlessData | null;
    error?: NFCError;
  }> {
    const result = await this.readTag(options);

    if (!result.success || !result.data) {
      return {
        success: false,
        braceletId: null,
        cashlessData: null,
        error: result.error,
      };
    }

    if (result.data.type !== 'cashless') {
      return {
        success: false,
        braceletId: result.tagId,
        cashlessData: null,
        error: new NFCError(NFCErrorCode.INVALID_TAG, 'Not a cashless bracelet'),
      };
    }

    return {
      success: true,
      braceletId: result.tagId,
      cashlessData: result.data.cashless || null,
    };
  }

  /**
   * Quick read - just get tag ID without parsing
   */
  async readTagId(): Promise<string | null> {
    try {
      await this.manager.startSession([NfcTech.Ndef, NfcTech.NfcA]);

      const tag = await NfcManager.getTag();

      if (!tag) {
        return null;
      }

      this.manager.provideFeedback('success');
      return this.extractTagId(tag);
    } catch (error) {
      console.error('[NFCReader] Error reading tag ID:', error);
      return null;
    } finally {
      await this.manager.cleanUp();
    }
  }

  /**
   * Read raw NDEF messages
   */
  async readRawNdef(): Promise<string[] | null> {
    try {
      await this.manager.startSession([NfcTech.Ndef]);

      const tag = await NfcManager.getTag();

      if (!tag || !tag.ndefMessage) {
        return null;
      }

      const messages: string[] = [];

      for (const record of tag.ndefMessage) {
        if (record.payload) {
          const text = this.decodeNdefPayload(record.payload);
          if (text) {
            messages.push(text);
          }
        }
      }

      this.manager.provideFeedback('success');
      return messages;
    } catch (error) {
      console.error('[NFCReader] Error reading raw NDEF:', error);
      return null;
    } finally {
      await this.manager.cleanUp();
    }
  }

  /**
   * Check if tag is a valid festival bracelet
   */
  async isValidFestivalBracelet(): Promise<{
    isValid: boolean;
    braceletId: string | null;
    festivalId: string | null;
  }> {
    const result = await this.readTag({ validateSignature: true });

    if (!result.success || !result.data) {
      return { isValid: false, braceletId: null, festivalId: null };
    }

    return {
      isValid: result.data.type === 'cashless' && !!result.data.festivalId,
      braceletId: result.tagId,
      festivalId: result.data.festivalId || null,
    };
  }

  /**
   * Scan for nearby NFC tags (continuous mode)
   */
  async startContinuousScan(
    onTagFound: (result: NFCReadResult) => void,
    options: NFCReadOptions = {}
  ): Promise<() => void> {
    let isScanning = true;

    const scan = async () => {
      while (isScanning) {
        try {
          const result = await this.readTag(options);
          if (result.success) {
            onTagFound(result);
          }
          // Small delay between scans
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          if (!isScanning) break;
          console.error('[NFCReader] Continuous scan error:', error);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    };

    scan();

    return () => {
      isScanning = false;
      this.manager.stopSession();
    };
  }

  /**
   * Extract tag ID from tag event
   */
  private extractTagId(tag: TagEvent): string {
    if (tag.id) {
      // Convert byte array to hex string
      if (Array.isArray(tag.id)) {
        return tag.id.map(byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
      }
      return String(tag.id);
    }
    return '';
  }

  /**
   * Read NDEF data from tag
   */
  private async readNdefData(tag: TagEvent): Promise<string | null> {
    if (!tag.ndefMessage || tag.ndefMessage.length === 0) {
      return null;
    }

    const firstRecord = tag.ndefMessage[0];

    if (!firstRecord.payload) {
      return null;
    }

    return this.decodeNdefPayload(firstRecord.payload);
  }

  /**
   * Decode NDEF payload to string
   */
  private decodeNdefPayload(payload: number[]): string | null {
    try {
      // Check if it's a text record (first byte is status, second byte is language code length)
      if (payload.length < 3) {
        return null;
      }

      const statusByte = payload[0];
      const isUtf16 = (statusByte & 0x80) !== 0;
      const languageCodeLength = statusByte & 0x3f;

      const textStartIndex = 1 + languageCodeLength;
      const textBytes = payload.slice(textStartIndex);

      if (isUtf16) {
        // UTF-16 decoding
        const decoder = new TextDecoder('utf-16be');
        return decoder.decode(new Uint8Array(textBytes));
      } else {
        // UTF-8 decoding
        const decoder = new TextDecoder('utf-8');
        return decoder.decode(new Uint8Array(textBytes));
      }
    } catch (error) {
      console.error('[NFCReader] Error decoding payload:', error);
      return null;
    }
  }
}

export default NFCReader;
