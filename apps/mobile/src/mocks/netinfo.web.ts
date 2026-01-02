// Web mock for @react-native-community/netinfo
// Uses browser's navigator.onLine API

type NetInfoState = {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  type: string;
};

type NetInfoListener = (state: NetInfoState) => void;

const getState = (): NetInfoState => ({
  isConnected: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isInternetReachable: typeof navigator !== 'undefined' ? navigator.onLine : true,
  type: 'unknown',
});

const listeners = new Set<NetInfoListener>();

// Set up browser event listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    const state = getState();
    listeners.forEach((listener) => listener(state));
  });

  window.addEventListener('offline', () => {
    const state = getState();
    listeners.forEach((listener) => listener(state));
  });
}

const NetInfo = {
  addEventListener: (listener: NetInfoListener) => {
    listeners.add(listener);
    // Call immediately with current state
    listener(getState());
    // Return unsubscribe function
    return () => {
      listeners.delete(listener);
    };
  },

  fetch: (): Promise<NetInfoState> => {
    return Promise.resolve(getState());
  },

  refresh: (): Promise<NetInfoState> => {
    return Promise.resolve(getState());
  },
};

export default NetInfo;
