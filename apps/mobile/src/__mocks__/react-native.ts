/* eslint-disable @typescript-eslint/no-explicit-any */
// Mock for react-native
import React from 'react';

// Basic View mock
export const View = ({
  children,
  testID,
  style,
  ...props
}: {
  children?: React.ReactNode;
  testID?: string;
  style?: any;
  [key: string]: any;
}) => React.createElement('View', { testID, style, ...props }, children);

// Basic Text mock
export const Text = ({
  children,
  style,
  numberOfLines,
  ...props
}: {
  children?: React.ReactNode;
  style?: any;
  numberOfLines?: number;
  [key: string]: any;
}) => React.createElement('Text', { style, numberOfLines, ...props }, children);

// TouchableOpacity mock
export const TouchableOpacity = ({
  children,
  onPress,
  disabled,
  activeOpacity,
  style,
  testID,
  ...props
}: {
  children?: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  activeOpacity?: number;
  style?: any;
  testID?: string;
  [key: string]: any;
}) =>
  React.createElement(
    'TouchableOpacity',
    { onPress, disabled, activeOpacity, style, testID, ...props },
    children
  );

// TouchableWithoutFeedback mock
export const TouchableWithoutFeedback = ({
  children,
  onPress,
  ...props
}: {
  children?: React.ReactNode;
  onPress?: () => void;
  [key: string]: any;
}) => React.createElement('TouchableWithoutFeedback', { onPress, ...props }, children);

// Pressable mock
export const Pressable = ({
  children,
  onPress,
  style,
  ...props
}: {
  children?: React.ReactNode;
  onPress?: () => void;
  style?: any;
  [key: string]: any;
}) => React.createElement('Pressable', { onPress, style, ...props }, children);

// TextInput mock
export const TextInput = ({
  value,
  onChangeText,
  placeholder,
  style,
  testID,
  ...props
}: {
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  style?: any;
  testID?: string;
  [key: string]: any;
}) =>
  React.createElement('TextInput', {
    value,
    onChangeText,
    placeholder,
    style,
    testID,
    ...props,
  });

// ScrollView mock
export const ScrollView = ({
  children,
  style,
  ...props
}: {
  children?: React.ReactNode;
  style?: any;
  [key: string]: any;
}) => React.createElement('ScrollView', { style, ...props }, children);

// FlatList mock
export const FlatList = ({
  data,
  renderItem,
  keyExtractor,
  ...props
}: {
  data: any[];
  renderItem: (info: { item: any; index: number }) => React.ReactNode;
  keyExtractor?: (item: any, index: number) => string;
  [key: string]: any;
}) =>
  React.createElement(
    'FlatList',
    props,
    data.map((item, index) =>
      React.createElement(
        React.Fragment,
        { key: keyExtractor ? keyExtractor(item, index) : String(index) },
        renderItem({ item, index })
      )
    )
  );

// Image mock
export const Image = ({
  source,
  style,
  testID,
  ...props
}: {
  source: any;
  style?: any;
  testID?: string;
  [key: string]: any;
}) => React.createElement('Image', { source, style, testID, ...props });

// ActivityIndicator mock
export const ActivityIndicator = ({
  size,
  color,
  ...props
}: {
  size?: 'small' | 'large' | number;
  color?: string;
  [key: string]: any;
}) => React.createElement('ActivityIndicator', { size, color, ...props });

// Modal mock
export const Modal = ({
  children,
  visible,
  ...props
}: {
  children?: React.ReactNode;
  visible?: boolean;
  [key: string]: any;
}) => (visible ? React.createElement('Modal', props, children) : null);

// StyleSheet mock
export const StyleSheet = {
  create: <T extends Record<string, any>>(styles: T): T => styles,
  absoluteFillObject: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  absoluteFill: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  hairlineWidth: 1,
  flatten: (style: any) => style,
};

// Dimensions mock
export const Dimensions = {
  get: (_dim: 'window' | 'screen') => ({
    width: 375,
    height: 812,
    scale: 2,
    fontScale: 1,
  }),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
  set: jest.fn(),
};

// Platform mock
export const Platform = {
  OS: 'ios' as const,
  Version: '14.0',
  isPad: false,
  isTVOS: false,
  isTV: false,
  select: <T>(obj: { ios?: T; android?: T; default?: T; web?: T }): T | undefined =>
    obj.ios ?? obj.default,
};

// Alert mock
export const Alert = {
  alert: jest.fn(),
  prompt: jest.fn(),
};

// Animated mock
export const Animated = {
  View: View,
  Text: Text,
  Image: Image,
  ScrollView: ScrollView,
  FlatList: FlatList,
  Value: jest.fn(() => ({
    setValue: jest.fn(),
    interpolate: jest.fn(() => 0),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    stopAnimation: jest.fn(),
  })),
  timing: jest.fn(() => ({
    start: jest.fn((cb?: () => void) => cb?.()),
    stop: jest.fn(),
    reset: jest.fn(),
  })),
  spring: jest.fn(() => ({
    start: jest.fn((cb?: () => void) => cb?.()),
    stop: jest.fn(),
    reset: jest.fn(),
  })),
  decay: jest.fn(() => ({
    start: jest.fn((cb?: () => void) => cb?.()),
    stop: jest.fn(),
    reset: jest.fn(),
  })),
  sequence: jest.fn(() => ({
    start: jest.fn((cb?: () => void) => cb?.()),
    stop: jest.fn(),
    reset: jest.fn(),
  })),
  parallel: jest.fn(() => ({
    start: jest.fn((cb?: () => void) => cb?.()),
    stop: jest.fn(),
    reset: jest.fn(),
  })),
  loop: jest.fn(() => ({
    start: jest.fn((cb?: () => void) => cb?.()),
    stop: jest.fn(),
    reset: jest.fn(),
  })),
  event: jest.fn(),
  createAnimatedComponent: jest.fn((component: any) => component),
};

// Keyboard mock
export const Keyboard = {
  dismiss: jest.fn(),
  addListener: jest.fn(() => ({ remove: jest.fn() })),
  removeListener: jest.fn(),
  removeAllListeners: jest.fn(),
  isVisible: jest.fn(() => false),
  metrics: jest.fn(() => null),
};

// StatusBar mock
export const StatusBar = {
  setBarStyle: jest.fn(),
  setBackgroundColor: jest.fn(),
  setHidden: jest.fn(),
  setNetworkActivityIndicatorVisible: jest.fn(),
  setTranslucent: jest.fn(),
  currentHeight: 44,
};

// AppState mock
export const AppState = {
  currentState: 'active' as const,
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
};

// PixelRatio mock
export const PixelRatio = {
  get: () => 2,
  getFontScale: () => 1,
  getPixelSizeForLayoutSize: (layoutSize: number) => layoutSize * 2,
  roundToNearestPixel: (layoutSize: number) => layoutSize,
};

// Linking mock
export const Linking = {
  openURL: jest.fn(() => Promise.resolve()),
  canOpenURL: jest.fn(() => Promise.resolve(true)),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
};

// Share mock
export const Share = {
  share: jest.fn(() => Promise.resolve({ action: 'sharedAction' })),
  sharedAction: 'sharedAction',
  dismissedAction: 'dismissedAction',
};

// Vibration mock
export const Vibration = {
  vibrate: jest.fn(),
  cancel: jest.fn(),
};

// InteractionManager mock
export const InteractionManager = {
  runAfterInteractions: jest.fn((callback: () => void) => {
    callback();
    return { cancel: jest.fn() };
  }),
  createInteractionHandle: jest.fn(),
  clearInteractionHandle: jest.fn(),
};

// useColorScheme mock
export const useColorScheme = () => 'light';

// useWindowDimensions mock
export const useWindowDimensions = () => ({
  width: 375,
  height: 812,
  scale: 2,
  fontScale: 1,
});

export default {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Pressable,
  TextInput,
  ScrollView,
  FlatList,
  Image,
  ActivityIndicator,
  Modal,
  StyleSheet,
  Dimensions,
  Platform,
  Alert,
  Animated,
  Keyboard,
  StatusBar,
  AppState,
  PixelRatio,
  Linking,
  Share,
  Vibration,
  InteractionManager,
  useColorScheme,
  useWindowDimensions,
};
