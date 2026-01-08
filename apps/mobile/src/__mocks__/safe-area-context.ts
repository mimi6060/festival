/* eslint-disable @typescript-eslint/no-explicit-any */
// Mock for react-native-safe-area-context
import React from 'react';

export const SafeAreaProvider = ({ children }: { children: React.ReactNode }) => children;

export const SafeAreaView = ({
  children,
}: {
  children: React.ReactNode;
  style?: any;
  edges?: string[];
}) => children;

export const useSafeAreaInsets = () => ({
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
});

export const useSafeAreaFrame = () => ({
  x: 0,
  y: 0,
  width: 375,
  height: 812,
});

export default {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
  useSafeAreaFrame,
};
