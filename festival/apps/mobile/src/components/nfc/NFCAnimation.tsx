/**
 * NFCAnimation Component
 * Animated visual feedback for NFC scanning operations
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { colors, spacing, borderRadius } from '../../theme';

// Animation status
export type NFCAnimationStatus = 'idle' | 'scanning' | 'success' | 'error';

// Animation Props
export interface NFCAnimationProps {
  isScanning?: boolean;
  status?: NFCAnimationStatus;
  size?: number;
  color?: string;
  showLabel?: boolean;
}

export const NFCAnimation: React.FC<NFCAnimationProps> = ({
  isScanning = false,
  status = 'idle',
  size = 150,
  color,
  showLabel = true,
}) => {
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.3)).current;
  const waveAnim1 = useRef(new Animated.Value(0)).current;
  const waveAnim2 = useRef(new Animated.Value(0)).current;
  const waveAnim3 = useRef(new Animated.Value(0)).current;

  // Determine color based on status
  const getStatusColor = (): string => {
    if (color) return color;
    switch (status) {
      case 'scanning':
        return colors.primary;
      case 'success':
        return colors.success;
      case 'error':
        return colors.error;
      default:
        return colors.textMuted;
    }
  };

  const statusColor = getStatusColor();

  // Start/stop animations based on scanning state
  useEffect(() => {
    if (isScanning || status === 'scanning') {
      // Pulse animation
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

      // Rotate animation
      const rotate = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );

      // Wave animations (staggered)
      const wave1 = Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim1, {
            toValue: 1,
            duration: 1500,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(waveAnim1, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

      const wave2 = Animated.loop(
        Animated.sequence([
          Animated.delay(500),
          Animated.timing(waveAnim2, {
            toValue: 1,
            duration: 1500,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(waveAnim2, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

      const wave3 = Animated.loop(
        Animated.sequence([
          Animated.delay(1000),
          Animated.timing(waveAnim3, {
            toValue: 1,
            duration: 1500,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(waveAnim3, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

      pulse.start();
      rotate.start();
      wave1.start();
      wave2.start();
      wave3.start();

      return () => {
        pulse.stop();
        rotate.stop();
        wave1.stop();
        wave2.stop();
        wave3.stop();
      };
    } else if (status === 'success') {
      // Success animation
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    } else if (status === 'error') {
      // Error shake animation
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 0.05,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: -0.05,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0.05,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 50,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animations
      pulseAnim.setValue(1);
      rotateAnim.setValue(0);
      scaleAnim.setValue(1);
      waveAnim1.setValue(0);
      waveAnim2.setValue(0);
      waveAnim3.setValue(0);
    }
  }, [isScanning, status]);

  // Interpolate rotation
  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Wave scale interpolations
  const createWaveStyle = (waveAnim: Animated.Value) => ({
    transform: [
      {
        scale: waveAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 2],
        }),
      },
    ],
    opacity: waveAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.6, 0],
    }),
  });

  // Get status icon
  const getStatusIcon = (): string => {
    switch (status) {
      case 'scanning':
        return '📡';
      case 'success':
        return '✓';
      case 'error':
        return '✗';
      default:
        return '📶';
    }
  };

  // Get status label
  const getStatusLabel = (): string => {
    switch (status) {
      case 'scanning':
        return 'Recherche en cours...';
      case 'success':
        return 'Tag detecte !';
      case 'error':
        return 'Erreur de lecture';
      default:
        return 'Pret a scanner';
    }
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Wave rings */}
      {(isScanning || status === 'scanning') && (
        <>
          <Animated.View
            style={[
              styles.wave,
              {
                width: size * 0.8,
                height: size * 0.8,
                borderRadius: size * 0.4,
                borderColor: statusColor,
              },
              createWaveStyle(waveAnim1),
            ]}
          />
          <Animated.View
            style={[
              styles.wave,
              {
                width: size * 0.8,
                height: size * 0.8,
                borderRadius: size * 0.4,
                borderColor: statusColor,
              },
              createWaveStyle(waveAnim2),
            ]}
          />
          <Animated.View
            style={[
              styles.wave,
              {
                width: size * 0.8,
                height: size * 0.8,
                borderRadius: size * 0.4,
                borderColor: statusColor,
              },
              createWaveStyle(waveAnim3),
            ]}
          />
        </>
      )}

      {/* Main circle */}
      <Animated.View
        style={[
          styles.mainCircle,
          {
            width: size * 0.6,
            height: size * 0.6,
            borderRadius: size * 0.3,
            backgroundColor: statusColor + '20',
            borderColor: statusColor,
            transform: [
              { scale: Animated.multiply(pulseAnim, scaleAnim) },
              { rotate: rotation },
            ],
          },
        ]}
      >
        {/* Inner circle */}
        <View
          style={[
            styles.innerCircle,
            {
              width: size * 0.4,
              height: size * 0.4,
              borderRadius: size * 0.2,
              backgroundColor: statusColor + '40',
            },
          ]}
        >
          {/* Icon */}
          <Text
            style={[
              styles.icon,
              {
                fontSize: size * 0.2,
                color: status === 'success' || status === 'error' ? colors.white : statusColor,
              },
            ]}
          >
            {getStatusIcon()}
          </Text>
        </View>
      </Animated.View>

      {/* Status label */}
      {showLabel && (
        <View style={styles.labelContainer}>
          <Text style={[styles.label, { color: statusColor }]}>
            {getStatusLabel()}
          </Text>
        </View>
      )}
    </View>
  );
};

// Simple pulsing indicator
export const NFCPulseIndicator: React.FC<{
  isActive: boolean;
  color?: string;
  size?: number;
}> = ({ isActive, color = colors.primary, size = 20 }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isActive) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.5,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isActive]);

  return (
    <Animated.View
      style={[
        styles.pulseIndicator,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          transform: [{ scale: pulseAnim }],
          opacity: pulseAnim.interpolate({
            inputRange: [1, 1.5],
            outputRange: [1, 0.5],
          }),
        },
      ]}
    />
  );
};

// NFC phone animation
export const NFCPhoneAnimation: React.FC<{
  isActive: boolean;
}> = ({ isActive }) => {
  const phoneAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(phoneAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(phoneAnim, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [isActive]);

  const translateY = phoneAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  return (
    <View style={styles.phoneContainer}>
      <Animated.View style={{ transform: [{ translateY }] }}>
        <Text style={styles.phoneIcon}>📱</Text>
      </Animated.View>
      <View style={styles.braceletContainer}>
        <Text style={styles.braceletIcon}>⌚</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wave: {
    position: 'absolute',
    borderWidth: 2,
  },
  mainCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  innerCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontWeight: 'bold',
  },
  labelContainer: {
    position: 'absolute',
    bottom: -30,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Pulse indicator
  pulseIndicator: {},

  // Phone animation
  phoneContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
  },
  phoneIcon: {
    fontSize: 48,
  },
  braceletContainer: {
    position: 'absolute',
    bottom: 10,
  },
  braceletIcon: {
    fontSize: 32,
  },
});

export default NFCAnimation;
