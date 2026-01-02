/**
 * useNFC Hook
 * Main hook for NFC operations in the Festival app
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform, Alert, Linking } from 'react-native';
import {
  nfcManager,
  NFCStatus,
  NFCError,
  NFCErrorCode,
  NFCEventListener,
} from '../services/nfc';
import type { TagEvent } from 'react-native-nfc-manager';

// NFC Hook State
export interface UseNFCState {
  isSupported: boolean;
  isEnabled: boolean;
  isReady: boolean;
  isScanning: boolean;
  status: NFCStatus;
  error: NFCError | null;
  lastTag: TagEvent | null;
}

// NFC Hook Options
export interface UseNFCOptions {
  autoInit?: boolean;
  enableVibration?: boolean;
  enableSound?: boolean;
  alertMessage?: string;
  onTagDiscovered?: (tag: TagEvent) => void;
  onError?: (error: NFCError) => void;
}

const DEFAULT_OPTIONS: UseNFCOptions = {
  autoInit: true,
  enableVibration: true,
  enableSound: true,
  alertMessage: 'Approchez votre bracelet NFC',
};

export function useNFC(options: UseNFCOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const [state, setState] = useState<UseNFCState>({
    isSupported: false,
    isEnabled: false,
    isReady: false,
    isScanning: false,
    status: 'unavailable',
    error: null,
    lastTag: null,
  });

  const listenerRef = useRef<(() => void) | null>(null);

  /**
   * Initialize NFC
   */
  const initialize = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));

      const supported = await nfcManager.initialize({
        enableVibration: opts.enableVibration,
        enableSound: opts.enableSound,
        alertMessage: opts.alertMessage,
      });

      const enabled = await nfcManager.checkNFCEnabled();

      setState(prev => ({
        ...prev,
        isSupported: supported,
        isEnabled: enabled,
        isReady: supported && enabled,
        status: nfcManager.getStatus(),
      }));

      return supported && enabled;
    } catch (error) {
      const nfcError = error instanceof NFCError
        ? error
        : new NFCError(NFCErrorCode.UNKNOWN, String(error));

      setState(prev => ({
        ...prev,
        error: nfcError,
        status: 'error',
      }));

      opts.onError?.(nfcError);
      return false;
    }
  }, [opts]);

  /**
   * Setup event listeners
   */
  useEffect(() => {
    const listener: NFCEventListener = {
      onTagDiscovered: (tag) => {
        setState(prev => ({ ...prev, lastTag: tag }));
        opts.onTagDiscovered?.(tag);
      },
      onSessionStarted: () => {
        setState(prev => ({ ...prev, isScanning: true, status: 'scanning' }));
      },
      onSessionClosed: () => {
        setState(prev => ({
          ...prev,
          isScanning: false,
          status: nfcManager.getStatus(),
        }));
      },
      onError: (error) => {
        setState(prev => ({ ...prev, error }));
        opts.onError?.(error);
      },
    };

    listenerRef.current = nfcManager.addListener(listener);

    return () => {
      listenerRef.current?.();
    };
  }, [opts]);

  /**
   * Auto-initialize on mount
   */
  useEffect(() => {
    if (opts.autoInit) {
      initialize();
    }
  }, [opts.autoInit, initialize]);

  /**
   * Check and refresh NFC status
   */
  const refreshStatus = useCallback(async () => {
    const enabled = await nfcManager.checkNFCEnabled();
    const status = nfcManager.getStatus();

    setState(prev => ({
      ...prev,
      isEnabled: enabled,
      isReady: prev.isSupported && enabled,
      status,
    }));

    return enabled;
  }, []);

  /**
   * Open NFC settings
   */
  const openSettings = useCallback(async () => {
    if (Platform.OS === 'android') {
      await nfcManager.openNFCSettings();
    } else {
      // iOS doesn't have direct NFC settings, open general settings
      Alert.alert(
        'NFC',
        'Pour activer le NFC, allez dans Reglages > NFC',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Ouvrir Reglages', onPress: () => Linking.openSettings() },
        ]
      );
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * Get platform info
   */
  const getPlatformInfo = useCallback(() => {
    return nfcManager.getPlatformInfo();
  }, []);

  return {
    // State
    ...state,

    // Actions
    initialize,
    refreshStatus,
    openSettings,
    clearError,
    getPlatformInfo,

    // Manager instance for advanced usage
    manager: nfcManager,
  };
}

export default useNFC;
