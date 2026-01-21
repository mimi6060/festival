/**
 * NFC Writer Service
 * Handles writing data to NFC tags for the Festival cashless system
 */

import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
import { NFCFormatter, NFCTagData, CashlessData } from './NFCFormatter';
import { NFCError, NFCErrorCode, default as NFCManagerService } from './NFCManager';

// Write result interface
export interface NFCWriteResult {
  success: boolean;
  tagId: string | null;
  bytesWritten: number;
  error?: NFCError;
}

// Write options
export interface NFCWriteOptions {
  timeout?: number;
  encryptData?: boolean;
  signData?: boolean;
  overwrite?: boolean;
}

const DEFAULT_WRITE_OPTIONS: NFCWriteOptions = {
  timeout: 30000,
  encryptData: true,
  signData: true,
  overwrite: false,
};

export class NFCWriter {
  private manager: NFCManagerService;
  private formatter: NFCFormatter;

  constructor(manager: NFCManagerService) {
    this.manager = manager;
    this.formatter = new NFCFormatter();
  }

  /**
   * Write data to NFC tag
   */
  async writeTag(data: NFCTagData, options: NFCWriteOptions = {}): Promise<NFCWriteResult> {
    const opts = { ...DEFAULT_WRITE_OPTIONS, ...options };

    try {
      // Start NFC session for writing
      await this.manager.startSession([NfcTech.Ndef]);

      // Get tag
      const tag = await NfcManager.getTag();

      if (!tag) {
        throw new NFCError(NFCErrorCode.TAG_NOT_FOUND, 'No NFC tag found');
      }

      // Check if tag is writable
      const isWritable = await this.isTagWritable();
      if (!isWritable) {
        throw new NFCError(NFCErrorCode.WRITE_ERROR, 'Tag is not writable');
      }

      // Check if tag already has data and overwrite is false
      if (!opts.overwrite && tag.ndefMessage && tag.ndefMessage.length > 0) {
        throw new NFCError(
          NFCErrorCode.WRITE_ERROR,
          'Tag already contains data. Enable overwrite to continue.'
        );
      }

      // Encode data
      const payload = this.formatter.encodeTagData(data, opts.encryptData);

      // Sign data if required
      if (opts.signData) {
        this.formatter.signPayload(payload);
      }

      // Format payload as string
      const payloadString = this.formatter.formatPayload(payload);

      // Create NDEF message
      const bytes = this.createNdefMessage(payloadString);

      // Write to tag
      await NfcManager.ndefHandler.writeNdefMessage(bytes);

      // Extract tag ID
      const tagId = this.extractTagId(tag);

      this.manager.provideFeedback('success');

      return {
        success: true,
        tagId,
        bytesWritten: bytes.length,
      };
    } catch (error) {
      this.manager.provideFeedback('error');

      if (error instanceof NFCError) {
        return {
          success: false,
          tagId: null,
          bytesWritten: 0,
          error,
        };
      }

      return {
        success: false,
        tagId: null,
        bytesWritten: 0,
        error: new NFCError(NFCErrorCode.WRITE_ERROR, `Write failed: ${error}`),
      };
    } finally {
      await this.manager.cleanUp();
    }
  }

  /**
   * Write cashless bracelet data
   */
  async writeCashlessBracelet(
    cashlessData: CashlessData,
    festivalId: string,
    options: NFCWriteOptions = {}
  ): Promise<NFCWriteResult> {
    const data: NFCTagData = {
      type: 'cashless',
      version: '1.0',
      festivalId,
      cashless: cashlessData,
      timestamp: Date.now(),
    };

    return this.writeTag(data, {
      ...options,
      encryptData: true,
      signData: true,
    });
  }

  /**
   * Link bracelet to user account
   */
  async linkBraceletToAccount(
    userId: string,
    accountId: string,
    festivalId: string,
    initialBalance = 0,
    options: NFCWriteOptions = {}
  ): Promise<NFCWriteResult> {
    const cashlessData: CashlessData = {
      accountId,
      balance: initialBalance,
      lastTransaction: null,
      linkedUserId: userId,
      status: 'active',
    };

    return this.writeCashlessBracelet(cashlessData, festivalId, {
      ...options,
      overwrite: true,
    });
  }

  /**
   * Update balance on bracelet (offline cache)
   */
  async updateBraceletBalance(
    newBalance: number,
    lastTransactionId: string,
    options: NFCWriteOptions = {}
  ): Promise<NFCWriteResult> {
    try {
      // First read current data
      await this.manager.startSession([NfcTech.Ndef]);

      const tag = await NfcManager.getTag();

      if (!tag?.ndefMessage || tag.ndefMessage.length === 0) {
        throw new NFCError(NFCErrorCode.INVALID_TAG, 'Cannot read current tag data');
      }

      // Parse current data
      const currentPayload = this.parseNdefMessage(tag.ndefMessage);
      if (!currentPayload) {
        throw new NFCError(NFCErrorCode.INVALID_TAG, 'Invalid tag data format');
      }

      const currentData = this.formatter.decodeTagData(
        this.formatter.parsePayload(currentPayload),
        true
      );

      if (!currentData.cashless) {
        throw new NFCError(NFCErrorCode.INVALID_TAG, 'Not a cashless bracelet');
      }

      // Update data
      const updatedData: NFCTagData = {
        ...currentData,
        cashless: {
          ...currentData.cashless,
          balance: newBalance,
          lastTransaction: lastTransactionId,
        },
        timestamp: Date.now(),
      };

      // Clean up current session
      await this.manager.cleanUp();

      // Write updated data
      return this.writeTag(updatedData, {
        ...options,
        overwrite: true,
      });
    } catch (error) {
      await this.manager.cleanUp();

      if (error instanceof NFCError) {
        return {
          success: false,
          tagId: null,
          bytesWritten: 0,
          error,
        };
      }

      return {
        success: false,
        tagId: null,
        bytesWritten: 0,
        error: new NFCError(NFCErrorCode.WRITE_ERROR, `Update failed: ${error}`),
      };
    }
  }

  /**
   * Clear/reset NFC tag
   */
  async clearTag(_options: NFCWriteOptions = {}): Promise<NFCWriteResult> {
    try {
      await this.manager.startSession([NfcTech.Ndef]);

      const tag = await NfcManager.getTag();

      if (!tag) {
        throw new NFCError(NFCErrorCode.TAG_NOT_FOUND, 'No NFC tag found');
      }

      // Write empty message
      const emptyBytes = Ndef.encodeMessage([Ndef.textRecord('')]);

      if (!emptyBytes) {
        throw new NFCError(NFCErrorCode.WRITE_ERROR, 'Failed to create empty message');
      }

      await NfcManager.ndefHandler.writeNdefMessage(emptyBytes);

      const tagId = this.extractTagId(tag);

      this.manager.provideFeedback('success');

      return {
        success: true,
        tagId,
        bytesWritten: emptyBytes.length,
      };
    } catch (error) {
      this.manager.provideFeedback('error');

      if (error instanceof NFCError) {
        return {
          success: false,
          tagId: null,
          bytesWritten: 0,
          error,
        };
      }

      return {
        success: false,
        tagId: null,
        bytesWritten: 0,
        error: new NFCError(NFCErrorCode.WRITE_ERROR, `Clear failed: ${error}`),
      };
    } finally {
      await this.manager.cleanUp();
    }
  }

  /**
   * Write transfer request to tag (for peer-to-peer transfer)
   */
  async writeTransferRequest(
    fromUserId: string,
    amount: number,
    festivalId: string,
    options: NFCWriteOptions = {}
  ): Promise<NFCWriteResult> {
    const transferData: NFCTagData = {
      type: 'transfer',
      version: '1.0',
      festivalId,
      transfer: {
        fromUserId,
        amount,
        timestamp: Date.now(),
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes expiry
        status: 'pending',
      },
      timestamp: Date.now(),
    };

    return this.writeTag(transferData, {
      ...options,
      encryptData: true,
      signData: true,
      overwrite: true,
    });
  }

  /**
   * Check if tag is writable
   */
  private async isTagWritable(): Promise<boolean> {
    try {
      // Check if tag supports writing
      const tag = await NfcManager.getTag();

      if (!tag) {
        return false;
      }

      // Most NDEF tags are writable unless locked
      // Additional checks can be added for specific tag types
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create NDEF message from text
   */
  private createNdefMessage(text: string): number[] {
    const bytes = Ndef.encodeMessage([Ndef.textRecord(text)]);

    if (!bytes) {
      throw new NFCError(NFCErrorCode.WRITE_ERROR, 'Failed to encode NDEF message');
    }

    return bytes;
  }

  /**
   * Parse NDEF message to string
   */
  private parseNdefMessage(ndefMessage: { payload?: number[] }[]): string | null {
    if (!ndefMessage || ndefMessage.length === 0) {
      return null;
    }

    const firstRecord = ndefMessage[0];

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
      if (payload.length < 3) {
        return null;
      }

      const statusByte = payload[0];
      const languageCodeLength = statusByte & 0x3f;
      const textStartIndex = 1 + languageCodeLength;
      const textBytes = payload.slice(textStartIndex);

      const decoder = new TextDecoder('utf-8');
      return decoder.decode(new Uint8Array(textBytes));
    } catch {
      return null;
    }
  }

  /**
   * Extract tag ID from tag
   */
  private extractTagId(tag: { id?: number[] | string }): string {
    if (tag.id) {
      if (Array.isArray(tag.id)) {
        return tag.id
          .map((byte) => byte.toString(16).padStart(2, '0'))
          .join('')
          .toUpperCase();
      }
      return String(tag.id);
    }
    return '';
  }
}

export default NFCWriter;
