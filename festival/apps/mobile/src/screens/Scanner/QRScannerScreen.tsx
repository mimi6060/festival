import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, Button } from '../../components/common';
import { colors, spacing, typography, borderRadius } from '../../theme';
import type { RootStackParamList } from '../../types';

const { width } = Dimensions.get('window');
const SCAN_AREA_SIZE = width * 0.7;

type ScannerNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface ScanResult {
  type: 'ticket' | 'payment' | 'unknown';
  data: string;
  valid: boolean;
}

export const QRScannerScreen: React.FC = () => {
  const navigation = useNavigation<ScannerNavigationProp>();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);

  useEffect(() => {
    // Request camera permission
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    // In a real app, use react-native-camera or expo-camera
    // For now, simulate permission granted
    setHasPermission(true);
  };

  const handleBarCodeScanned = (data: string) => {
    if (!isScanning) return;

    setIsScanning(false);

    // Parse QR code data
    const result = parseQRCode(data);
    setLastScan(result);

    if (result.valid) {
      handleValidScan(result);
    } else {
      handleInvalidScan(result);
    }
  };

  const parseQRCode = (data: string): ScanResult => {
    // Parse different QR code formats
    // Festival ticket format: FEST-TICKET-{ticketId}-{signature}
    // Payment format: FEST-PAY-{amount}-{vendorId}

    if (data.startsWith('FEST-TICKET-')) {
      return {
        type: 'ticket',
        data: data,
        valid: true,
      };
    }

    if (data.startsWith('FEST-PAY-')) {
      return {
        type: 'payment',
        data: data,
        valid: true,
      };
    }

    return {
      type: 'unknown',
      data: data,
      valid: false,
    };
  };

  const handleValidScan = (result: ScanResult) => {
    if (result.type === 'ticket') {
      // Extract ticket ID and validate
      const parts = result.data.split('-');
      const ticketId = parts[2];

      Alert.alert(
        'Billet valide',
        `Billet #${ticketId} scanne avec succes!`,
        [
          {
            text: 'Voir le billet',
            onPress: () => {
              navigation.navigate('TicketDetail', { ticketId });
            },
          },
          {
            text: 'Scanner un autre',
            onPress: () => {
              setIsScanning(true);
              setLastScan(null);
            },
          },
        ]
      );
    } else if (result.type === 'payment') {
      const parts = result.data.split('-');
      const amount = parseFloat(parts[2]);
      const vendorId = parts[3];

      Alert.alert(
        'Paiement',
        `Confirmer le paiement de ${amount.toFixed(2)} EUR?`,
        [
          { text: 'Annuler', style: 'cancel', onPress: () => setIsScanning(true) },
          {
            text: 'Confirmer',
            onPress: () => {
              // Process payment
              Alert.alert('Succes', 'Paiement effectue!', [
                { text: 'OK', onPress: () => setIsScanning(true) },
              ]);
            },
          },
        ]
      );
    }
  };

  const handleInvalidScan = (result: ScanResult) => {
    Alert.alert(
      'QR Code non reconnu',
      'Ce QR code n\'est pas valide pour le festival.',
      [
        {
          text: 'Reessayer',
          onPress: () => {
            setIsScanning(true);
            setLastScan(null);
          },
        },
      ]
    );
  };

  const handleManualEntry = () => {
    Alert.prompt(
      'Saisie manuelle',
      'Entrez le code du billet',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Valider',
          onPress: (code) => {
            if (code) {
              handleBarCodeScanned(`FEST-TICKET-${code}-manual`);
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const toggleFlash = () => {
    setFlashEnabled(!flashEnabled);
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionIcon}>📷</Text>
          <Text style={styles.permissionTitle}>Autorisation requise</Text>
          <Text style={styles.permissionText}>
            Chargement...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionIcon}>🚫</Text>
          <Text style={styles.permissionTitle}>Acces camera refuse</Text>
          <Text style={styles.permissionText}>
            L'acces a la camera est necessaire pour scanner les QR codes.
            Veuillez l'autoriser dans les parametres.
          </Text>
          <Button
            title="Ouvrir les parametres"
            onPress={() => {
              // Open app settings
            }}
            style={styles.permissionButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.closeIcon}>X</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Scanner</Text>
        <TouchableOpacity
          style={styles.flashButton}
          onPress={toggleFlash}
        >
          <Text style={styles.flashIcon}>
            {flashEnabled ? '🔦' : '💡'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Camera Preview (Placeholder) */}
      <View style={styles.cameraContainer}>
        <View style={styles.cameraPlaceholder}>
          <Text style={styles.cameraText}>Camera Preview</Text>
          <Text style={styles.cameraSubtext}>
            (Integration react-native-camera requise)
          </Text>
        </View>

        {/* Scan Frame */}
        <View style={styles.scanFrame}>
          <View style={styles.scanCorner} />
          <View style={[styles.scanCorner, styles.topRight]} />
          <View style={[styles.scanCorner, styles.bottomLeft]} />
          <View style={[styles.scanCorner, styles.bottomRight]} />

          {isScanning && (
            <View style={styles.scanLine} />
          )}
        </View>

        {/* Overlay */}
        <View style={styles.overlay}>
          <View style={styles.overlayTop} />
          <View style={styles.overlayMiddle}>
            <View style={styles.overlaySide} />
            <View style={styles.scanArea} />
            <View style={styles.overlaySide} />
          </View>
          <View style={styles.overlayBottom} />
        </View>
      </View>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionTitle}>
          {isScanning ? 'Placez le QR code dans le cadre' : 'Traitement en cours...'}
        </Text>
        <Text style={styles.instructionText}>
          Le scan est automatique des que le code est detecte
        </Text>
      </View>

      {/* Scan Types Info */}
      <View style={styles.scanTypesContainer}>
        <Card style={styles.scanTypeCard}>
          <View style={styles.scanType}>
            <Text style={styles.scanTypeIcon}>🎟️</Text>
            <View style={styles.scanTypeInfo}>
              <Text style={styles.scanTypeTitle}>Billets</Text>
              <Text style={styles.scanTypeText}>Validez votre entree</Text>
            </View>
          </View>
        </Card>
        <Card style={styles.scanTypeCard}>
          <View style={styles.scanType}>
            <Text style={styles.scanTypeIcon}>💳</Text>
            <View style={styles.scanTypeInfo}>
              <Text style={styles.scanTypeTitle}>Paiement</Text>
              <Text style={styles.scanTypeText}>Payez avec le cashless</Text>
            </View>
          </View>
        </Card>
      </View>

      {/* Manual Entry */}
      <View style={styles.footer}>
        <Button
          title="Saisie manuelle"
          onPress={handleManualEntry}
          variant="outline"
          fullWidth
        />
      </View>

      {/* Demo Button (for testing) */}
      {__DEV__ && (
        <TouchableOpacity
          style={styles.demoButton}
          onPress={() => handleBarCodeScanned('FEST-TICKET-12345-demo123')}
        >
          <Text style={styles.demoButtonText}>Simuler un scan (Dev)</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 18,
    color: colors.white,
    fontWeight: '700',
  },
  title: {
    ...typography.h2,
    color: colors.white,
  },
  flashButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashIcon: {
    fontSize: 20,
  },
  cameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cameraPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraText: {
    ...typography.h2,
    color: colors.textMuted,
  },
  cameraSubtext: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: SCAN_AREA_SIZE,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  scanFrame: {
    position: 'absolute',
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
  },
  scanCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: colors.primary,
    borderWidth: 4,
    borderRadius: 4,
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    right: 0,
    left: undefined,
    borderLeftWidth: 0,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    top: undefined,
    borderTopWidth: 0,
    borderBottomWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    top: undefined,
    left: undefined,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 4,
    borderBottomWidth: 4,
  },
  scanLine: {
    position: 'absolute',
    width: '100%',
    height: 2,
    backgroundColor: colors.primary,
    top: '50%',
  },
  instructions: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  instructionTitle: {
    ...typography.h3,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  instructionText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
  },
  scanTypesContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  scanTypeCard: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  scanType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanTypeIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  scanTypeInfo: {
    flex: 1,
  },
  scanTypeTitle: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
  },
  scanTypeText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  permissionIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  permissionTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  permissionText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  permissionButton: {
    marginTop: spacing.md,
  },
  demoButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  demoButtonText: {
    ...typography.caption,
    color: colors.primary,
  },
});

export default QRScannerScreen;
