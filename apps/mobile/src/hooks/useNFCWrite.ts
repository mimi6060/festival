/**
 * useNFCWrite Hook
 * Hook for writing to NFC tags in the Festival app
 */

import { useState, useCallback } from 'react';
import {
  nfcManager,
  NFCError,
  NFCErrorCode,
  NFCWriteResult,
  NFCWriteOptions,
  NFCTagData,
  CashlessData,
} from '../services/nfc';

// Write State
export interface UseNFCWriteState {
  isWriting: boolean;
  lastWriteResult: NFCWriteResult | null;
  error: NFCError | null;
}

// Write Hook Options
export interface UseNFCWriteOptions extends NFCWriteOptions {
  onSuccess?: (result: NFCWriteResult) => void;
  onError?: (error: NFCError) => void;
}

export function useNFCWrite(options: UseNFCWriteOptions = {}) {
  const [state, setState] = useState<UseNFCWriteState>({
    isWriting: false,
    lastWriteResult: null,
    error: null,
  });

  /**
   * Write generic data to NFC tag
   */
  const writeTag = useCallback(async (data: NFCTagData): Promise<NFCWriteResult> => {
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
        bytesWritten: 0,
        error,
      };
    }

    setState(prev => ({
      ...prev,
      isWriting: true,
      error: null,
    }));

    try {
      const result = await nfcManager.writer.writeTag(data, {
        timeout: options.timeout,
        encryptData: options.encryptData,
        signData: options.signData,
        overwrite: options.overwrite,
      });

      setState(prev => ({
        ...prev,
        isWriting: false,
        lastWriteResult: result,
        error: result.error || null,
      }));

      if (result.success) {
        options.onSuccess?.(result);
      } else if (result.error) {
        options.onError?.(result.error);
      }

      return result;
    } catch (error) {
      const nfcError = error instanceof NFCError
        ? error
        : new NFCError(NFCErrorCode.WRITE_ERROR, String(error));

      setState(prev => ({
        ...prev,
        isWriting: false,
        error: nfcError,
      }));

      options.onError?.(nfcError);

      return {
        success: false,
        tagId: null,
        bytesWritten: 0,
        error: nfcError,
      };
    }
  }, [options]);

  /**
   * Write cashless bracelet data
   */
  const writeCashlessBracelet = useCallback(async (
    cashlessData: CashlessData,
    festivalId: string
  ): Promise<NFCWriteResult> => {
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
        bytesWritten: 0,
        error,
      };
    }

    setState(prev => ({
      ...prev,
      isWriting: true,
      error: null,
    }));

    try {
      const result = await nfcManager.writer.writeCashlessBracelet(
        cashlessData,
        festivalId,
        {
          timeout: options.timeout,
          encryptData: options.encryptData ?? true,
          signData: options.signData ?? true,
          overwrite: options.overwrite,
        }
      );

      setState(prev => ({
        ...prev,
        isWriting: false,
        lastWriteResult: result,
        error: result.error || null,
      }));

      if (result.success) {
        options.onSuccess?.(result);
      } else if (result.error) {
        options.onError?.(result.error);
      }

      return result;
    } catch (error) {
      const nfcError = error instanceof NFCError
        ? error
        : new NFCError(NFCErrorCode.WRITE_ERROR, String(error));

      setState(prev => ({
        ...prev,
        isWriting: false,
        error: nfcError,
      }));

      options.onError?.(nfcError);

      return {
        success: false,
        tagId: null,
        bytesWritten: 0,
        error: nfcError,
      };
    }
  }, [options]);

  /**
   * Link bracelet to user account
   */
  const linkBraceletToAccount = useCallback(async (
    userId: string,
    accountId: string,
    festivalId: string,
    initialBalance = 0
  ): Promise<NFCWriteResult> => {
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
        bytesWritten: 0,
        error,
      };
    }

    setState(prev => ({
      ...prev,
      isWriting: true,
      error: null,
    }));

    try {
      const result = await nfcManager.writer.linkBraceletToAccount(
        userId,
        accountId,
        festivalId,
        initialBalance,
        {
          timeout: options.timeout,
          encryptData: true,
          signData: true,
          overwrite: true,
        }
      );

      setState(prev => ({
        ...prev,
        isWriting: false,
        lastWriteResult: result,
        error: result.error || null,
      }));

      if (result.success) {
        options.onSuccess?.(result);
      } else if (result.error) {
        options.onError?.(result.error);
      }

      return result;
    } catch (error) {
      const nfcError = error instanceof NFCError
        ? error
        : new NFCError(NFCErrorCode.WRITE_ERROR, String(error));

      setState(prev => ({
        ...prev,
        isWriting: false,
        error: nfcError,
      }));

      options.onError?.(nfcError);

      return {
        success: false,
        tagId: null,
        bytesWritten: 0,
        error: nfcError,
      };
    }
  }, [options]);

  /**
   * Update bracelet balance
   */
  const updateBraceletBalance = useCallback(async (
    newBalance: number,
    lastTransactionId: string
  ): Promise<NFCWriteResult> => {
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
        bytesWritten: 0,
        error,
      };
    }

    setState(prev => ({
      ...prev,
      isWriting: true,
      error: null,
    }));

    try {
      const result = await nfcManager.writer.updateBraceletBalance(
        newBalance,
        lastTransactionId,
        {
          timeout: options.timeout,
          encryptData: true,
          signData: true,
          overwrite: true,
        }
      );

      setState(prev => ({
        ...prev,
        isWriting: false,
        lastWriteResult: result,
        error: result.error || null,
      }));

      if (result.success) {
        options.onSuccess?.(result);
      } else if (result.error) {
        options.onError?.(result.error);
      }

      return result;
    } catch (error) {
      const nfcError = error instanceof NFCError
        ? error
        : new NFCError(NFCErrorCode.WRITE_ERROR, String(error));

      setState(prev => ({
        ...prev,
        isWriting: false,
        error: nfcError,
      }));

      options.onError?.(nfcError);

      return {
        success: false,
        tagId: null,
        bytesWritten: 0,
        error: nfcError,
      };
    }
  }, [options]);

  /**
   * Write transfer request to tag
   */
  const writeTransferRequest = useCallback(async (
    fromUserId: string,
    amount: number,
    festivalId: string
  ): Promise<NFCWriteResult> => {
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
        bytesWritten: 0,
        error,
      };
    }

    setState(prev => ({
      ...prev,
      isWriting: true,
      error: null,
    }));

    try {
      const result = await nfcManager.writer.writeTransferRequest(
        fromUserId,
        amount,
        festivalId,
        {
          timeout: options.timeout,
          encryptData: true,
          signData: true,
          overwrite: true,
        }
      );

      setState(prev => ({
        ...prev,
        isWriting: false,
        lastWriteResult: result,
        error: result.error || null,
      }));

      if (result.success) {
        options.onSuccess?.(result);
      } else if (result.error) {
        options.onError?.(result.error);
      }

      return result;
    } catch (error) {
      const nfcError = error instanceof NFCError
        ? error
        : new NFCError(NFCErrorCode.WRITE_ERROR, String(error));

      setState(prev => ({
        ...prev,
        isWriting: false,
        error: nfcError,
      }));

      options.onError?.(nfcError);

      return {
        success: false,
        tagId: null,
        bytesWritten: 0,
        error: nfcError,
      };
    }
  }, [options]);

  /**
   * Clear/reset NFC tag
   */
  const clearTag = useCallback(async (): Promise<NFCWriteResult> => {
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
        bytesWritten: 0,
        error,
      };
    }

    setState(prev => ({
      ...prev,
      isWriting: true,
      error: null,
    }));

    try {
      const result = await nfcManager.writer.clearTag({
        timeout: options.timeout,
      });

      setState(prev => ({
        ...prev,
        isWriting: false,
        lastWriteResult: result,
        error: result.error || null,
      }));

      if (result.success) {
        options.onSuccess?.(result);
      } else if (result.error) {
        options.onError?.(result.error);
      }

      return result;
    } catch (error) {
      const nfcError = error instanceof NFCError
        ? error
        : new NFCError(NFCErrorCode.WRITE_ERROR, String(error));

      setState(prev => ({
        ...prev,
        isWriting: false,
        error: nfcError,
      }));

      options.onError?.(nfcError);

      return {
        success: false,
        tagId: null,
        bytesWritten: 0,
        error: nfcError,
      };
    }
  }, [options]);

  /**
   * Cancel ongoing write operation
   */
  const cancelWrite = useCallback(async () => {
    await nfcManager.stopSession();
    setState(prev => ({
      ...prev,
      isWriting: false,
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
    setState(prev => ({ ...prev, lastWriteResult: null }));
  }, []);

  return {
    // State
    ...state,

    // Actions
    writeTag,
    writeCashlessBracelet,
    linkBraceletToAccount,
    updateBraceletBalance,
    writeTransferRequest,
    clearTag,
    cancelWrite,
    clearError,
    clearLastResult,
  };
}

export default useNFCWrite;
