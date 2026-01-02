/**
 * NetworkDetector.ts
 * Handles network state detection with comprehensive connection info
 * Supports connection quality estimation and network type detection
 */

import NetInfo, {
  NetInfoState,
  NetInfoStateType,
  NetInfoCellularGeneration,
} from '@react-native-community/netinfo';
import { Logger } from '../../utils/Logger';

export type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'none';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: NetInfoStateType;
  isWifi: boolean;
  isCellular: boolean;
  cellularGeneration: NetInfoCellularGeneration | null;
  quality: ConnectionQuality;
  details: NetInfoState['details'];
  timestamp: number;
}

export interface ConnectionMetrics {
  latency: number | null;
  downloadSpeed: number | null;
  uploadSpeed: number | null;
  lastChecked: number;
}

type NetworkListener = (isOnline: boolean, status: NetworkStatus) => void;

class NetworkDetector {
  private static instance: NetworkDetector;
  private currentStatus: NetworkStatus;
  private metrics: ConnectionMetrics;
  private listeners: Set<NetworkListener> = new Set();
  private unsubscribe: (() => void) | null = null;
  private isInitialized: boolean = false;
  private connectionCheckInterval: NodeJS.Timeout | null = null;
  private pingEndpoint: string = 'https://www.google.com/generate_204';

  private constructor() {
    this.currentStatus = this.getDefaultStatus();
    this.metrics = this.getDefaultMetrics();
  }

  public static getInstance(): NetworkDetector {
    if (!NetworkDetector.instance) {
      NetworkDetector.instance = new NetworkDetector();
    }
    return NetworkDetector.instance;
  }

  private getDefaultStatus(): NetworkStatus {
    return {
      isConnected: true,
      isInternetReachable: null,
      type: 'unknown' as NetInfoStateType,
      isWifi: false,
      isCellular: false,
      cellularGeneration: null,
      quality: 'none',
      details: null,
      timestamp: Date.now(),
    };
  }

  private getDefaultMetrics(): ConnectionMetrics {
    return {
      latency: null,
      downloadSpeed: null,
      uploadSpeed: null,
      lastChecked: 0,
    };
  }

  /**
   * Initialize the network detector
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      Logger.debug('[NetworkDetector] Already initialized');
      return;
    }

    try {
      // Get initial state
      const state = await NetInfo.fetch();
      this.updateStatus(state);

      // Subscribe to network changes
      this.unsubscribe = NetInfo.addEventListener((state) => {
        const wasOnline = this.currentStatus.isConnected && this.currentStatus.isInternetReachable !== false;
        this.updateStatus(state);
        const isOnline = this.currentStatus.isConnected && this.currentStatus.isInternetReachable !== false;

        // Notify listeners if online status changed
        if (wasOnline !== isOnline) {
          this.notifyListeners(isOnline);
        }
      });

      // Start periodic connection quality checks
      this.startConnectionQualityChecks();

      this.isInitialized = true;
      Logger.info('[NetworkDetector] Initialized successfully');
    } catch (error) {
      Logger.error('[NetworkDetector] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Update the current network status
   */
  private updateStatus(state: NetInfoState): void {
    const previousQuality = this.currentStatus.quality;

    this.currentStatus = {
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable,
      type: state.type,
      isWifi: state.type === 'wifi',
      isCellular: state.type === 'cellular',
      cellularGeneration: state.type === 'cellular' && state.details
        ? (state.details as { cellularGeneration?: NetInfoCellularGeneration }).cellularGeneration ?? null
        : null,
      quality: this.estimateConnectionQuality(state),
      details: state.details,
      timestamp: Date.now(),
    };

    // Log quality changes
    if (previousQuality !== this.currentStatus.quality) {
      Logger.info(`[NetworkDetector] Connection quality changed: ${previousQuality} -> ${this.currentStatus.quality}`);
    }

    Logger.debug('[NetworkDetector] Status updated:', this.currentStatus);
  }

  /**
   * Estimate connection quality based on network type and details
   */
  private estimateConnectionQuality(state: NetInfoState): ConnectionQuality {
    if (!state.isConnected) {
      return 'none';
    }

    if (state.isInternetReachable === false) {
      return 'none';
    }

    switch (state.type) {
      case 'wifi':
        // WiFi is generally good to excellent
        return this.metrics.latency !== null && this.metrics.latency < 50
          ? 'excellent'
          : 'good';

      case 'cellular':
        if (state.details) {
          const details = state.details as { cellularGeneration?: NetInfoCellularGeneration };
          switch (details.cellularGeneration) {
            case '5g':
              return 'excellent';
            case '4g':
              return 'good';
            case '3g':
              return 'fair';
            case '2g':
              return 'poor';
            default:
              return 'fair';
          }
        }
        return 'fair';

      case 'ethernet':
        return 'excellent';

      case 'bluetooth':
        return 'poor';

      case 'vpn':
        return 'good';

      case 'other':
        return 'fair';

      default:
        return 'fair';
    }
  }

  /**
   * Start periodic connection quality checks
   */
  private startConnectionQualityChecks(): void {
    // Check every 30 seconds when online
    this.connectionCheckInterval = setInterval(() => {
      if (this.isOnline()) {
        this.measureLatency().catch((error) => {
          Logger.debug('[NetworkDetector] Latency measurement failed:', error);
        });
      }
    }, 30000);
  }

  /**
   * Stop connection quality checks
   */
  private stopConnectionQualityChecks(): void {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }
  }

  /**
   * Measure network latency by pinging an endpoint
   */
  public async measureLatency(): Promise<number | null> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      await fetch(this.pingEndpoint, {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const latency = Date.now() - startTime;
      this.metrics.latency = latency;
      this.metrics.lastChecked = Date.now();

      // Re-estimate quality with new latency data
      const state = await NetInfo.fetch();
      this.updateStatus(state);

      Logger.debug(`[NetworkDetector] Latency measured: ${latency}ms`);
      return latency;
    } catch (error) {
      Logger.debug('[NetworkDetector] Failed to measure latency:', error);
      return null;
    }
  }

  /**
   * Check if the device is online
   */
  public isOnline(): boolean {
    return (
      this.currentStatus.isConnected &&
      this.currentStatus.isInternetReachable !== false
    );
  }

  /**
   * Check if the device is offline
   */
  public isOffline(): boolean {
    return !this.isOnline();
  }

  /**
   * Get current network status
   */
  public getStatus(): NetworkStatus {
    return { ...this.currentStatus };
  }

  /**
   * Get connection metrics
   */
  public getMetrics(): ConnectionMetrics {
    return { ...this.metrics };
  }

  /**
   * Get connection quality
   */
  public getQuality(): ConnectionQuality {
    return this.currentStatus.quality;
  }

  /**
   * Check if on WiFi
   */
  public isWifi(): boolean {
    return this.currentStatus.isWifi;
  }

  /**
   * Check if on cellular
   */
  public isCellular(): boolean {
    return this.currentStatus.isCellular;
  }

  /**
   * Check if connection is metered (cellular or metered wifi)
   */
  public isMetered(): boolean {
    if (this.currentStatus.isCellular) {
      return true;
    }

    if (this.currentStatus.isWifi && this.currentStatus.details) {
      const details = this.currentStatus.details as { isConnectionExpensive?: boolean };
      return details.isConnectionExpensive ?? false;
    }

    return false;
  }

  /**
   * Check if connection quality is good enough for operation
   */
  public isQualitySufficient(minimumQuality: ConnectionQuality = 'fair'): boolean {
    const qualityOrder: ConnectionQuality[] = ['none', 'poor', 'fair', 'good', 'excellent'];
    const currentIndex = qualityOrder.indexOf(this.currentStatus.quality);
    const minimumIndex = qualityOrder.indexOf(minimumQuality);
    return currentIndex >= minimumIndex;
  }

  /**
   * Add a network change listener
   */
  public addListener(listener: NetworkListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Remove a specific listener
   */
  public removeListener(listener: NetworkListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Remove all listeners
   */
  public removeAllListeners(): void {
    this.listeners.clear();
  }

  /**
   * Notify all listeners of network change
   */
  private notifyListeners(isOnline: boolean): void {
    this.listeners.forEach((listener) => {
      try {
        listener(isOnline, this.currentStatus);
      } catch (error) {
        Logger.error('[NetworkDetector] Listener error:', error);
      }
    });
  }

  /**
   * Force refresh network status
   */
  public async refresh(): Promise<NetworkStatus> {
    try {
      const state = await NetInfo.fetch();
      this.updateStatus(state);
      this.notifyListeners(this.isOnline());
      return this.currentStatus;
    } catch (error) {
      Logger.error('[NetworkDetector] Refresh failed:', error);
      return this.currentStatus;
    }
  }

  /**
   * Wait for connection to be available
   */
  public async waitForConnection(timeoutMs: number = 30000): Promise<boolean> {
    if (this.isOnline()) {
      return true;
    }

    return new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => {
        this.removeListener(listener);
        resolve(false);
      }, timeoutMs);

      const listener: NetworkListener = (isOnline) => {
        if (isOnline) {
          clearTimeout(timeout);
          this.removeListener(listener);
          resolve(true);
        }
      };

      this.addListener(listener);
    });
  }

  /**
   * Wait for good connection quality
   */
  public async waitForGoodConnection(
    minimumQuality: ConnectionQuality = 'fair',
    timeoutMs: number = 30000
  ): Promise<boolean> {
    if (this.isQualitySufficient(minimumQuality)) {
      return true;
    }

    return new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => {
        this.removeListener(listener);
        resolve(false);
      }, timeoutMs);

      const listener: NetworkListener = () => {
        if (this.isQualitySufficient(minimumQuality)) {
          clearTimeout(timeout);
          this.removeListener(listener);
          resolve(true);
        }
      };

      this.addListener(listener);
    });
  }

  /**
   * Set custom ping endpoint for latency measurement
   */
  public setPingEndpoint(endpoint: string): void {
    this.pingEndpoint = endpoint;
    Logger.debug(`[NetworkDetector] Ping endpoint set to: ${endpoint}`);
  }

  /**
   * Get network type as human-readable string
   */
  public getNetworkTypeName(): string {
    if (!this.currentStatus.isConnected) {
      return 'Disconnected';
    }

    switch (this.currentStatus.type) {
      case 'wifi':
        return 'WiFi';
      case 'cellular':
        const gen = this.currentStatus.cellularGeneration;
        return gen ? `Cellular (${gen.toUpperCase()})` : 'Cellular';
      case 'ethernet':
        return 'Ethernet';
      case 'bluetooth':
        return 'Bluetooth';
      case 'vpn':
        return 'VPN';
      case 'other':
        return 'Other';
      default:
        return 'Unknown';
    }
  }

  /**
   * Get quality as human-readable string
   */
  public getQualityName(): string {
    const qualityNames: Record<ConnectionQuality, string> = {
      excellent: 'Excellent',
      good: 'Good',
      fair: 'Fair',
      poor: 'Poor',
      none: 'No Connection',
    };
    return qualityNames[this.currentStatus.quality];
  }

  /**
   * Check if should use reduced data mode (metered or poor connection)
   */
  public shouldUseReducedDataMode(): boolean {
    return this.isMetered() || this.currentStatus.quality === 'poor';
  }

  /**
   * Check if should defer large operations (poor or fair connection)
   */
  public shouldDeferLargeOperations(): boolean {
    return (
      this.currentStatus.quality === 'poor' ||
      (this.currentStatus.quality === 'fair' && this.isMetered())
    );
  }

  /**
   * Cleanup and destroy instance
   */
  public destroy(): void {
    this.stopConnectionQualityChecks();

    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    this.listeners.clear();
    this.isInitialized = false;

    Logger.info('[NetworkDetector] Destroyed');
  }
}

export const networkDetector = NetworkDetector.getInstance();
export default NetworkDetector;
