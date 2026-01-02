/**
 * useNFCRead Hook
 * Hook for reading NFC tags in the Festival app
 */

import { useState, useCallback, useRef } from 'react';
import {
  nfcManager,
  NFCError,
  NFCErrorCode,
  NFCReadResult,
  NFCReadOptions,
  NFCTagData,
  CashlessData,
} from '../services/nfc';

// Read State
export interface UseNFCReadState {
  isReading: boolean;
  lastReadResult: NFCReadResult | null;
  error: NFCError | null;
}

// Read Hook Options
export interface UseNFCReadOptions extends NFCReadOptions {
  onSuccess?: (result: NFCReadResult) => void;
  onError?: (error: NFCError) => void;
  onCashlessRead?: (data: CashlessData, braceletId: string) => void;
}

export function useNFCRead(options: UseNFCReadOptions = {}) {
  const [state, setState] = useState<UseNFCReadState>({
    isReading: false,
    lastReadResult: null,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Read any NFC tag
   */
  const readTag = useCallback(async (): Promise<NFCReadResult> => {
    if (!nfcManager.isReady()) {
      const error = new NFCError(
        NFCErrorCode.NOT_ENABLED,
        'NFC is not ready. Please enable NFC.'
      );
      setState(prev => ({ ...prev, error }));
      options.onError?.(error);
      return {
        success: false,
        tagId: null,
        data: null,
        rawPayload: null,
        error,
      };
    }

    setState(prev => ({
      ...prev,
      isReading: true,
      error: null,
    }));

    try {
      const result = await nfcManager.reader.readTag({
        timeout: options.timeout,
        validateSignature: options.validateSignature,
        decryptData: options.decryptData,
      });

      setState(prev => ({
        ...prev,
        isReading: false,
        lastReadResult: result,
        error: result.error || null,
      }));

      if (result.success) {
        options.onSuccess?.(result);

        // Check if it's cashless data
        if (result.data?.type === 'cashless' && result.data.cashless && result.tagId) {
          options.onCashlessRead?.(result.data.cashless, result.tagId);
        }
      } else if (result.error) {
        options.onError?.(result.error);
      }

      return result;
    } catch (error) {
      const nfcError = error instanceof NFCError
        ? error
        : new NFCError(NFCErrorCode.READ_ERROR, String(error));

      setState(prev => ({
        ...prev,
        isReading: false,
        error: nfcError,
      }));

      options.onError?.(nfcError);

      return {
        success: false,
        tagId: null,
        data: null,
        rawPayload: null,
        error: nfcError,
      };
    }
  }, [options]);

  /**
   * Read cashless bracelet specifically
   */
  const readCashlessBracelet = useCallback(async (): Promise<{
    success: boolean;
    braceletId: string | null;
    cashlessData: CashlessData | null;
    error?: NFCError;
  }> => {
    if (!nfcManager.isReady()) {
      const error = new NFCError(
        NFCErrorCode.NOT_ENABLED,
        'NFC is not ready. Please enable NFC.'
      );
      setState(prev => ({ ...prev, error }));
      options.onError?.(error);
      return {
        success: false,
        braceletId: null,
        cashlessData: null,
        error,
      };
    }

    setState(prev => ({
      ...prev,
      isReading: true,
      error: null,
    }));

    try {
      const result = await nfcManager.reader.readCashlessBracelet({
        timeout: options.timeout,
        validateSignature: options.validateSignature ?? true,
        decryptData: options.decryptData ?? true,
      });

      setState(prev => ({
        ...prev,
        isReading: false,
        error: result.error || null,
      }));

      if (result.success && result.cashlessData && result.braceletId) {
        options.onCashlessRead?.(result.cashlessData, result.braceletId);
      } else if (result.error) {
        options.onError?.(result.error);
      }

      return result;
    } catch (error) {
      const nfcError = error instanceof NFCError
        ? error
        : new NFCError(NFCErrorCode.READ_ERROR, String(error));

      setState(prev => ({
        ...prev,
        isReading: false,
        error: nfcError,
      }));

      options.onError?.(nfcError);

      return {
        success: false,
        braceletId: null,
        cashlessData: null,
        error: nfcError,
      };
    }
  }, [options]);

  /**
   * Quick read - just get tag ID
   */
  const readTagId = useCallback(async (): Promise<string | null> => {
    if (!nfcManager.isReady()) {
      const error = new NFCError(
        NFCErrorCode.NOT_ENABLED,
        'NFC is not ready'
      );
      setState(prev => ({ ...prev, error }));
      options.onError?.(error);
      return null;
    }

    setState(prev => ({
      ...prev,
      isReading: true,
      error: null,
    }));

    try {
      const tagId = await nfcManager.reader.readTagId();

      setState(prev => ({
        ...prev,
        isReading: false,
      }));

      return tagId;
    } catch (error) {
      const nfcError = error instanceof NFCError
        ? error
        : new NFCError(NFCErrorCode.READ_ERROR, String(error));

      setState(prev => ({
        ...prev,
        isReading: false,
        error: nfcError,
      }));

      options.onError?.(nfcError);
      return null;
    }
  }, [options]);

  /**
   * Validate festival bracelet
   */
  const validateFestivalBracelet = useCallback(async (): Promise<{
    isValid: boolean;
    braceletId: string | null;
    festivalId: string | null;
  }> => {
    if (!nfcManager.isReady()) {
      return { isValid: false, braceletId: null, festivalId: null };
    }

    setState(prev => ({
      ...prev,
      isReading: true,
      error: null,
    }));

    try {
      const result = await nfcManager.reader.isValidFestivalBracelet();

      setState(prev => ({
        ...prev,
        isReading: false,
      }));

      return result;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isReading: false,
      }));

      return { isValid: false, braceletId: null, festivalId: null };
    }
  }, []);

  /**
   * Cancel ongoing read operation
   */
  const cancelRead = useCallback(async () => {
    await nfcManager.stopSession();
    setState(prev => ({
      ...prev,
      isReading: false,
    }));
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * Clear last result
   */
  const clearLastResult = useCallback(() => {
    setState(prev => ({ ...prev, lastReadResult: null }));
  }, []);

  return {
    // State
    ...state,

    // Actions
    readTag,
    readCashlessBracelet,
    readTagId,
    validateFestivalBracelet,
    cancelRead,
    clearError,
    clearLastResult,
  };
}

export default useNFCRead;
