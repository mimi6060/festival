/* eslint-disable @typescript-eslint/no-explicit-any */
// Jest setup for React Native mobile app tests
import '@testing-library/react-native/extend-expect';

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
    dispatch: jest.fn(),
    setOptions: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
  useFocusEffect: jest.fn(),
  useIsFocused: () => true,
}));

// Silence console warnings in tests
const originalWarn = console.warn;
const originalError = console.error;

console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Animated: `useNativeDriver`') ||
      args[0].includes('componentWillReceiveProps') ||
      args[0].includes('componentWillMount'))
  ) {
    return;
  }
  originalWarn(...args);
};

console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: ReactDOM.render') || args[0].includes('act(...)'))
  ) {
    return;
  }
  originalError(...args);
};

// Global test timeout
jest.setTimeout(10000);

// Mock global __DEV__
(global as any).__DEV__ = true;
