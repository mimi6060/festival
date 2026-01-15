/**
 * NFCScanner Component
 * Visual scanner component for NFC operations
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useNFC, useNFCRead } from '../../hooks';
import { NFCAnimation } from './NFCAnimation';
import { NFCStatus } from './NFCStatus';
import { colors, spacing, borderRadius, typography } from '../../theme';
import type { CashlessData } from '../../services/nfc';

// Scanner Mode
export type NFCScannerMode = 'read' | 'write' | 'transfer';

// Scanner Props
export interface NFCScannerProps {
  mode?: NFCScannerMode;
  title?: string;
  subtitle?: string;
  onScanSuccess?: (data: { tagId: string; cashlessData?: CashlessData }) => void;
  onScanError?: (error: Error) => void;
  onCancel?: () => void;
  autoStart?: boolean;
  showStatus?: boolean;
  showAnimation?: boolean;
  festivalId?: string;
}

export const NFCScanner: React.FC<NFCScannerProps> = ({
  mode = 'read',
  title = 'Scanner NFC',
  subtitle = 'Approchez votre bracelet du telephone',
  onScanSuccess,
  onScanError,
  onCancel,
  autoStart = false,
  showStatus = true,
  showAnimation = true,
  festivalId: _festivalId,
}) => {
  const [scanAttempts, setScanAttempts] = useState(0);

  const {
    isSupported,
    isEnabled,
    isReady,
    status,
    error: nfcError,
    openSettings,
  } = useNFC();

  const {
    isReading,
    error: readError,
    readCashlessBracelet,
    cancelRead,
  } = useNFCRead({
    onCashlessRead: (cashlessData, braceletId) => {
      onScanSuccess?.({ tagId: braceletId, cashlessData });
    },
    onError: (error) => {
      onScanError?.(error);
    },
  });

  // Auto start scanning
  useEffect(() => {
    if (autoStart && isReady && !isReading) {
      handleStartScan();
    }
  }, [autoStart, isReady]);

  /**
   * Start NFC scan
   */
  const handleStartScan = useCallback(async () => {
    setScanAttempts(prev => prev + 1);

    if (mode === 'read' || mode === 'transfer') {
      await readCashlessBracelet();
    }
  }, [mode, readCashlessBracelet]);

  /**
   * Cancel scan
   */
  const handleCancel = useCallback(async () => {
    await cancelRead();
    onCancel?.();
  }, [cancelRead, onCancel]);

  /**
   * Retry scan
   */
  const handleRetry = useCallback(() => {
    handleStartScan();
  }, [handleStartScan]);

  // Get current error
  const currentError = nfcError || readError;

  // Render NFC not supported
  if (!isSupported) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>📵</Text>
          <Text style={styles.errorTitle}>NFC non disponible</Text>
          <Text style={styles.errorMessage}>
            Votre appareil ne supporte pas le NFC.
            {Platform.OS === 'ios' && '\n(iPhone 7 ou superieur requis)'}
          </Text>
        </View>
      </View>
    );
  }

  // Render NFC disabled
  if (!isEnabled) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>📴</Text>
          <Text style={styles.errorTitle}>NFC desactive</Text>
          <Text style={styles.errorMessage}>
            Veuillez activer le NFC dans les parametres de votre appareil.
          </Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={openSettings}
          >
            <Text style={styles.settingsButtonText}>Ouvrir les parametres</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      {/* Animation */}
      {showAnimation && (
        <View style={styles.animationContainer}>
          <NFCAnimation
            isScanning={isReading}
            status={currentError ? 'error' : isReading ? 'scanning' : 'idle'}
          />
        </View>
      )}

      {/* Status */}
      {showStatus && (
        <NFCStatus
          status={status}
          isScanning={isReading}
          error={currentError}
        />
      )}

      {/* Error Display */}
      {currentError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>
            {currentError.message || 'Une erreur est survenue'}
          </Text>
          <TouchableOpacity onPress={handleRetry}>
            <Text style={styles.retryText}>Reessayer</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {!isReading ? (
          <TouchableOpacity
            style={styles.scanButton}
            onPress={handleStartScan}
          >
            <Text style={styles.scanButtonText}>
              {scanAttempts > 0 ? 'Scanner a nouveau' : 'Demarrer le scan'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
          >
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionTitle}>Instructions</Text>
        <View style={styles.instructionItem}>
          <Text style={styles.instructionNumber}>1</Text>
          <Text style={styles.instructionText}>
            Appuyez sur "Demarrer le scan"
          </Text>
        </View>
        <View style={styles.instructionItem}>
          <Text style={styles.instructionNumber}>2</Text>
          <Text style={styles.instructionText}>
            Approchez le bracelet du haut de votre telephone
          </Text>
        </View>
        <View style={styles.instructionItem}>
          <Text style={styles.instructionNumber}>3</Text>
          <Text style={styles.instructionText}>
            Maintenez jusqu'a la vibration
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  animationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    marginBottom: spacing.xl,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  errorTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  errorMessage: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  settingsButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  settingsButtonText: {
    ...typography.button,
    color: colors.white,
  },
  errorBanner: {
    backgroundColor: colors.error + '20',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  errorBannerText: {
    ...typography.bodySmall,
    color: colors.error,
    flex: 1,
  },
  retryText: {
    ...typography.button,
    color: colors.primary,
    marginLeft: spacing.md,
  },
  actions: {
    marginBottom: spacing.xl,
  },
  scanButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  scanButtonText: {
    ...typography.button,
    color: colors.white,
  },
  cancelButton: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    ...typography.button,
    color: colors.textSecondary,
  },
  instructions: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  instructionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    color: colors.white,
    textAlign: 'center',
    lineHeight: 24,
    marginRight: spacing.sm,
    fontSize: 12,
    fontWeight: '600',
  },
  instructionText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
});

export default NFCScanner;
