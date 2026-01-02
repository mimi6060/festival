import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme';

// Web-safe QR placeholder (native uses react-native-qrcode-svg)
let QRCodeComponent: React.FC<{ value: string; size: number }> = ({ value, size }) => {
  // Fallback for web - display a placeholder with the code
  return (
    <View style={[placeholderStyles.qrPlaceholder, { width: size, height: size }]}>
      <Text style={placeholderStyles.qrIcon}>📱</Text>
      <Text style={placeholderStyles.qrText}>QR Code</Text>
      <Text style={placeholderStyles.qrValue} numberOfLines={2}>{value}</Text>
    </View>
  );
};

// Try to load native QR code component
if (Platform.OS !== 'web') {
  try {
    const QRCode = require('react-native-qrcode-svg').default;
    QRCodeComponent = ({ value, size }) => (
      <QRCode
        value={value}
        size={size}
        color={colors.black}
        backgroundColor={colors.white}
      />
    );
  } catch (e) {
    // Keep fallback
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

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  value,
  size = 200,
  title,
  subtitle,
  showBorder = true,
}) => {
  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

      <View style={[styles.qrContainer, showBorder && styles.qrBorder]}>
        <View style={styles.qrBackground}>
          <QRCodeComponent value={value} size={size} />
        </View>

        {/* Corner decorations */}
        <View style={[styles.corner, styles.topLeft]} />
        <View style={[styles.corner, styles.topRight]} />
        <View style={[styles.corner, styles.bottomLeft]} />
        <View style={[styles.corner, styles.bottomRight]} />
      </View>

      <Text style={styles.instruction}>
        Presentez ce code a l'entree
      </Text>
    </View>
  );
};

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
    ...typography.bodySmall,
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
