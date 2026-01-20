import React, { memo, useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, Image } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme';

// Web QR Code component using qrcode library
const WebQRCode = memo(({ value, size }: { value: string; size: number }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const generateQR = async () => {
      try {
        const QRCode = await import('qrcode');
        const url = await QRCode.toDataURL(value, {
          width: size,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });
        setQrDataUrl(url);
      } catch (error) {
        console.error('Failed to generate QR code:', error);
      }
    };
    generateQR();
  }, [value, size]);

  if (!qrDataUrl) {
    return (
      <View style={[placeholderStyles.qrPlaceholder, { width: size, height: size }]}>
        <Text style={placeholderStyles.qrIcon}>⏳</Text>
        <Text style={placeholderStyles.qrText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <Image source={{ uri: qrDataUrl }} style={{ width: size, height: size }} resizeMode="contain" />
  );
});

// Memoized QR placeholder component for fallback
const QRPlaceholder = memo(({ value, size }: { value: string; size: number }) => (
  <View style={[placeholderStyles.qrPlaceholder, { width: size, height: size }]}>
    <Text style={placeholderStyles.qrIcon}>📱</Text>
    <Text style={placeholderStyles.qrText}>QR Code</Text>
    <Text style={placeholderStyles.qrValue} numberOfLines={2}>
      {value}
    </Text>
  </View>
));

// Select QR component based on platform
let QRCodeComponent: React.FC<{ value: string; size: number }>;

if (Platform.OS === 'web') {
  // Use web-compatible qrcode library
  QRCodeComponent = WebQRCode;
} else {
  // Try to load native QR code component with optimizations
  try {
    const QRCode = require('react-native-qrcode-svg').default;
    // Memoized native QR component for fast rendering (< 100ms target)
    QRCodeComponent = memo(({ value, size }: { value: string; size: number }) => (
      <QRCode
        value={value}
        size={size}
        color={colors.black}
        backgroundColor={colors.white}
        // Performance optimizations for < 100ms render
        ecl="L" // Low error correction = faster render
        quietZone={0} // No quiet zone for faster render
        enableLinearGradient={false} // Disable gradients for speed
      />
    ));
  } catch {
    // Fallback to placeholder
    QRCodeComponent = QRPlaceholder;
  }
}

const placeholderStyles = StyleSheet.create({
  qrPlaceholder: {
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  qrIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  qrText: {
    ...typography.body,
    color: colors.black,
    fontWeight: '600',
  },
  qrValue: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  title?: string;
  subtitle?: string;
  showBorder?: boolean;
}

// Memoized QRCodeDisplay component for optimized re-renders
export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = memo(
  ({ value, size = 200, title, subtitle, showBorder = true }) => {
    // Memoize container style to prevent unnecessary recalculations
    const containerStyle = useMemo(
      () => [styles.qrContainer, showBorder && styles.qrBorder],
      [showBorder]
    );

    return (
      <View style={styles.container}>
        {title && <Text style={styles.title}>{title}</Text>}
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

        <View style={containerStyle}>
          <View style={styles.qrBackground}>
            <QRCodeComponent value={value} size={size} />
          </View>

          {/* Corner decorations - static, no need to memoize */}
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>

        <Text style={styles.instruction}>Presentez ce code a l'entree</Text>
      </View>
    );
  }
);

const cornerSize = 20;
const cornerWidth = 3;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  title: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.small,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  qrContainer: {
    padding: spacing.lg,
    position: 'relative',
  },
  qrBorder: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.xl,
  },
  qrBackground: {
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
  },
  corner: {
    position: 'absolute',
    width: cornerSize,
    height: cornerSize,
    borderColor: colors.primary,
  },
  topLeft: {
    top: -1,
    left: -1,
    borderTopWidth: cornerWidth,
    borderLeftWidth: cornerWidth,
    borderTopLeftRadius: borderRadius.lg,
  },
  topRight: {
    top: -1,
    right: -1,
    borderTopWidth: cornerWidth,
    borderRightWidth: cornerWidth,
    borderTopRightRadius: borderRadius.lg,
  },
  bottomLeft: {
    bottom: -1,
    left: -1,
    borderBottomWidth: cornerWidth,
    borderLeftWidth: cornerWidth,
    borderBottomLeftRadius: borderRadius.lg,
  },
  bottomRight: {
    bottom: -1,
    right: -1,
    borderBottomWidth: cornerWidth,
    borderRightWidth: cornerWidth,
    borderBottomRightRadius: borderRadius.lg,
  },
  instruction: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});

export default QRCodeDisplay;
