// Mock for @react-native-community/netinfo

const listeners: ((state: NetInfoState) => void)[] = [];

interface NetInfoState {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  type: string;
}

const mockState: NetInfoState = {
  isConnected: true,
  isInternetReachable: true,
  type: 'wifi',
};

export const addEventListener = jest.fn((callback: (state: NetInfoState) => void) => {
  listeners.push(callback);
  return jest.fn(() => {
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  });
});

export const fetch = jest.fn(() => Promise.resolve(mockState));

export const refresh = jest.fn(() => Promise.resolve(mockState));

// Helper to trigger network state changes in tests
export const __triggerNetworkChange = (state: NetInfoState) => {
  listeners.forEach((listener) => listener(state));
};

export default {
  addEventListener,
  fetch,
  refresh,
  __triggerNetworkChange,
};
