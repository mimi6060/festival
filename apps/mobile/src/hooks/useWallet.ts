/**
 * useWallet.ts
 * React hook for Apple Wallet and Google Wallet integration
 * Provides pass management, addition, and status tracking
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform, Alert, Linking } from 'react-native';
import {
  walletManager,
  WalletManager,
  WalletType,
  WalletAvailability,
  AddToWalletResult,
  WalletPassInfo,
  WalletConfig,
} from '../services/wallet/WalletManager';

// Hook configuration
export interface UseWalletConfig {
  apiBaseUrl: string;
  // Apple Wallet
  applePassTypeIdentifier?: string;
  appleTeamIdentifier?: string;
  appleOrganizationName?: string;
  // Google Wallet
  googleIssuerId?: string;
}

// Pass status
export type PassStatus = 'not_added' | 'adding' | 'added' | 'error' | 'updating';

// Hook return type
export interface UseWalletReturn {
  // State
  isAvailable: boolean;
  walletType: WalletType;
  canAddPasses: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  checkAvailability: () => Promise<WalletAvailability>;
  addTicketToWallet: (passInfo: WalletPassInfo) => Promise<AddToWalletResult>;
  isTicketInWallet: (ticketId: string) => Promise<boolean>;
  removeTicketFromWallet: (ticketId: string) => Promise<boolean>;
  openWalletApp: () => Promise<void>;
  requestPassUpdate: (ticketId: string) => Promise<boolean>;

  // Utility
  getWalletName: () => string;
  getAddButtonText: () => string;
}

/**
 * Main wallet hook
 */
export function useWallet(config: UseWalletConfig): UseWalletReturn {
  const [isAvailable, setIsAvailable] = useState<boolean>(false);
  const [walletType, setWalletType] = useState<WalletType>('none');
  const [canAddPasses, setCanAddPasses] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const isInitializedRef = useRef<boolean>(false);

  // Initialize wallet manager
  useEffect(() => {
    const initWallet = async () => {
      if (isInitializedRef.current) return;

      try {
        setIsLoading(true);
        setError(null);

        const walletConfig: WalletConfig = {
          apiBaseUrl: config.apiBaseUrl,
        };

        if (Platform.OS === 'ios' && config.applePassTypeIdentifier) {
          walletConfig.apple = {
            passTypeIdentifier: config.applePassTypeIdentifier,
            teamIdentifier: config.appleTeamIdentifier || '',
            organizationName: config.appleOrganizationName || 'Festival',
          };
        }

        if (Platform.OS === 'android' && config.googleIssuerId) {
          walletConfig.google = {
            issuerId: config.googleIssuerId,
          };
        }

        await walletManager.initialize(walletConfig);
        isInitializedRef.current = true;

        // Check availability
        const availability = await walletManager.checkAvailability();
        setIsAvailable(availability.isAvailable);
        setWalletType(availability.walletType);
        setCanAddPasses(availability.canAddPasses);

        if (!availability.isAvailable && availability.reason) {
          console.log('[useWallet] Wallet not available:', availability.reason);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize wallet';
        setError(errorMessage);
        console.error('[useWallet] Initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initWallet();
  }, [config]);

  // Check availability
  const checkAvailability = useCallback(async (): Promise<WalletAvailability> => {
    const availability = await walletManager.checkAvailability();
    setIsAvailable(availability.isAvailable);
    setWalletType(availability.walletType);
    setCanAddPasses(availability.canAddPasses);
    return availability;
  }, []);

  // Add ticket to wallet
  const addTicketToWallet = useCallback(async (passInfo: WalletPassInfo): Promise<AddToWalletResult> => {
    try {
      setIsLoading(true);
      setError(null);

      if (!isAvailable || !canAddPasses) {
        return {
          success: false,
          walletType: walletType,
          error: 'Wallet not available or cannot add passes',
        };
      }

      const result = await walletManager.addToWallet(passInfo);

      if (!result.success && result.error) {
        setError(result.error);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add to wallet';
      setError(errorMessage);
      return {
        success: false,
        walletType: walletType,
        error: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable, canAddPasses, walletType]);

  // Check if ticket is in wallet
  const isTicketInWallet = useCallback(async (ticketId: string): Promise<boolean> => {
    try {
      return await walletManager.isPassInWallet(ticketId);
    } catch (err) {
      console.error('[useWallet] Error checking pass:', err);
      return false;
    }
  }, []);

  // Remove ticket from wallet
  const removeTicketFromWallet = useCallback(async (ticketId: string): Promise<boolean> => {
    try {
      if (Platform.OS === 'android') {
        // Google Wallet doesn't support programmatic removal
        Alert.alert(
          'Supprimer le pass',
          'Pour supprimer ce pass, ouvrez Google Wallet et supprimez-le manuellement.',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Ouvrir Wallet', onPress: () => walletManager.openWalletApp() },
          ]
        );
        return false;
      }

      return await walletManager.removeFromWallet(ticketId);
    } catch (err) {
      console.error('[useWallet] Error removing pass:', err);
      return false;
    }
  }, []);

  // Open wallet app
  const openWalletApp = useCallback(async (): Promise<void> => {
    try {
      await walletManager.openWalletApp();
    } catch (err) {
      console.error('[useWallet] Error opening wallet:', err);

      // Fallback: try to open app store
      if (Platform.OS === 'ios') {
        Linking.openURL('https://apps.apple.com/app/wallet/id1160481993');
      } else if (Platform.OS === 'android') {
        Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.apps.walletnfcrel');
      }
    }
  }, []);

  // Request pass update
  const requestPassUpdate = useCallback(async (ticketId: string): Promise<boolean> => {
    try {
      return await walletManager.requestPassUpdate(ticketId);
    } catch (err) {
      console.error('[useWallet] Error requesting update:', err);
      return false;
    }
  }, []);

  // Get wallet name for display
  const getWalletName = useCallback((): string => {
    switch (walletType) {
      case 'apple':
        return 'Apple Wallet';
      case 'google':
        return 'Google Wallet';
      default:
        return 'Wallet';
    }
  }, [walletType]);

  // Get add button text
  const getAddButtonText = useCallback((): string => {
    if (isLoading) return 'Chargement...';
    if (!isAvailable) return 'Wallet non disponible';
    if (!canAddPasses) return 'Impossible d\'ajouter';

    switch (walletType) {
      case 'apple':
        return 'Ajouter a Apple Wallet';
      case 'google':
        return 'Ajouter a Google Wallet';
      default:
        return 'Ajouter au Wallet';
    }
  }, [isLoading, isAvailable, canAddPasses, walletType]);

  return {
    isAvailable,
    walletType,
    canAddPasses,
    isLoading,
    error,
    checkAvailability,
    addTicketToWallet,
    isTicketInWallet,
    removeTicketFromWallet,
    openWalletApp,
    requestPassUpdate,
    getWalletName,
    getAddButtonText,
  };
}

/**
 * Hook for managing a single ticket's wallet status
 */
export interface UseTicketWalletReturn {
  status: PassStatus;
  isInWallet: boolean;
  isLoading: boolean;
  error: string | null;
  addToWallet: () => Promise<boolean>;
  removeFromWallet: () => Promise<boolean>;
  checkStatus: () => Promise<void>;
  needsUpdate: boolean;
  updatePass: () => Promise<boolean>;
}

export function useTicketWallet(
  ticketId: string,
  passInfo: WalletPassInfo,
  walletConfig: UseWalletConfig
): UseTicketWalletReturn {
  const wallet = useWallet(walletConfig);
  const [status, setStatus] = useState<PassStatus>('not_added');
  const [isInWallet, setIsInWallet] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [needsUpdate, setNeedsUpdate] = useState<boolean>(false);

  // Check initial status
  useEffect(() => {
    if (!wallet.isLoading && wallet.isAvailable) {
      checkStatus();
    }
  }, [wallet.isLoading, wallet.isAvailable, ticketId]);

  // Check pass status
  const checkStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const inWallet = await wallet.isTicketInWallet(ticketId);
      setIsInWallet(inWallet);
      setStatus(inWallet ? 'added' : 'not_added');

      // Check if needs update
      if (inWallet) {
        const updateStatus = await walletManager.getPassUpdateStatus(ticketId);
        setNeedsUpdate(updateStatus.needsUpdate);
      }
    } catch (err) {
      console.error('[useTicketWallet] Error checking status:', err);
    } finally {
      setIsLoading(false);
    }
  }, [ticketId, wallet]);

  // Add to wallet
  const addToWallet = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setStatus('adding');
      setError(null);

      const result = await wallet.addTicketToWallet(passInfo);

      if (result.success) {
        setStatus('added');
        setIsInWallet(true);
        return true;
      } else {
        setStatus('error');
        setError(result.error || 'Failed to add to wallet');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add to wallet';
      setStatus('error');
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [passInfo, wallet]);

  // Remove from wallet
  const removeFromWallet = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const success = await wallet.removeTicketFromWallet(ticketId);

      if (success) {
        setStatus('not_added');
        setIsInWallet(false);
      }

      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove from wallet';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [ticketId, wallet]);

  // Update pass
  const updatePass = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setStatus('updating');
      setError(null);

      const success = await wallet.requestPassUpdate(ticketId);

      if (success) {
        setNeedsUpdate(false);
        setStatus('added');
      } else {
        setStatus('added');
      }

      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update pass';
      setError(errorMessage);
      setStatus('added');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [ticketId, wallet]);

  return {
    status,
    isInWallet,
    isLoading: isLoading || wallet.isLoading,
    error: error || wallet.error,
    addToWallet,
    removeFromWallet,
    checkStatus,
    needsUpdate,
    updatePass,
  };
}

/**
 * Hook for batch adding multiple tickets to wallet
 */
export interface UseBatchWalletReturn {
  addAllToWallet: (passInfos: WalletPassInfo[]) => Promise<AddToWalletResult[]>;
  isAdding: boolean;
  progress: number;
  results: AddToWalletResult[];
  successCount: number;
  failureCount: number;
}

export function useBatchWallet(walletConfig: UseWalletConfig): UseBatchWalletReturn {
  const wallet = useWallet(walletConfig);
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [results, setResults] = useState<AddToWalletResult[]>([]);

  const addAllToWallet = useCallback(async (passInfos: WalletPassInfo[]): Promise<AddToWalletResult[]> => {
    if (!wallet.isAvailable || !wallet.canAddPasses) {
      return passInfos.map(() => ({
        success: false,
        walletType: wallet.walletType,
        error: 'Wallet not available',
      }));
    }

    setIsAdding(true);
    setProgress(0);
    setResults([]);

    const allResults: AddToWalletResult[] = [];

    for (let i = 0; i < passInfos.length; i++) {
      const result = await wallet.addTicketToWallet(passInfos[i]);
      allResults.push(result);
      setResults([...allResults]);
      setProgress(((i + 1) / passInfos.length) * 100);

      // Small delay between additions to avoid rate limiting
      if (i < passInfos.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    setIsAdding(false);
    return allResults;
  }, [wallet]);

  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;

  return {
    addAllToWallet,
    isAdding,
    progress,
    results,
    successCount,
    failureCount,
  };
}

/**
 * Simple hook to check wallet availability
 */
export function useWalletAvailability(): {
  isAvailable: boolean;
  walletType: WalletType;
  isLoading: boolean;
} {
  const [isAvailable, setIsAvailable] = useState<boolean>(false);
  const [walletType, setWalletType] = useState<WalletType>('none');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const check = async () => {
      try {
        // Quick check without full initialization
        if (Platform.OS === 'ios') {
          setWalletType('apple');
          setIsAvailable(true); // iOS usually supports Apple Wallet
        } else if (Platform.OS === 'android') {
          setWalletType('google');
          setIsAvailable(true); // Most Android devices support Google Wallet
        } else {
          setWalletType('none');
          setIsAvailable(false);
        }
      } finally {
        setIsLoading(false);
      }
    };

    check();
  }, []);

  return { isAvailable, walletType, isLoading };
}

export default useWallet;
