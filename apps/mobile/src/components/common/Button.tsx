import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  style,
  textStyle,
}) => {
  const isDisabled = disabled || loading;

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      ...styles.base,
      ...styles[size],
      ...(fullWidth && styles.fullWidth),
    };

    switch (variant) {
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: colors.secondary,
        };
      case 'outline':
        return {
          ...baseStyle,
          backgroundColor: colors.transparent,
          borderWidth: 2,
          borderColor: colors.primary,
        };
      case 'ghost':
        return {
          ...baseStyle,
          backgroundColor: colors.transparent,
        };
      default:
        return {
          ...baseStyle,
          backgroundColor: colors.primary,
        };
    }
  };

  const getTextStyle = (): TextStyle => {
    const baseTextStyle: TextStyle = {
      ...typography.button,
      color: colors.white,
    };

    if (variant === 'outline' || variant === 'ghost') {
      baseTextStyle.color = colors.primary;
    }

    if (isDisabled) {
      baseTextStyle.color = colors.textMuted;
    }

    return baseTextStyle;
  };

  return (
    <TouchableOpacity
      style={[
        getButtonStyle(),
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? colors.primary : colors.white}
        />
      ) : (
        <>
          {icon}
          <Text style={[getTextStyle(), icon && styles.textWithIcon, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
  },
  sm: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 36,
  },
  md: {
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
  },
  lg: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: 56,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  textWithIcon: {
    marginLeft: spacing.sm,
  },
});

export default Button;
