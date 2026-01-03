/**
 * OfflineMapManager Component
 * UI for downloading and managing offline map regions
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useOfflineMap } from '../../hooks/useOfflineMap';
import { OfflineRegion, MapRegion } from '../../services/maps/OfflineMapService';

interface OfflineMapManagerProps {
  festivalRegion?: MapRegion;
  festivalName?: string;
  onClose?: () => void;
}

export function OfflineMapManager({
  festivalRegion,
  festivalName = 'Festival Area',
  onClose,
}: OfflineMapManagerProps) {
  const {
    regions,
    isLoading,
    isDownloading,
    downloadProgress,
    currentDownload,
    cacheSize,
    error,
    downloadRegion,
    pauseDownload,
    deleteRegion,
    clearCache,
    calculateTileCount,
    estimateDownloadSize,
  } = useOfflineMap();

  const [selectedZoomRange, setSelectedZoomRange] = useState<{ min: number; max: number }>({
    min: 14,
    max: 17,
  });

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) {
      return '0 B';
    }
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: OfflineRegion['status']): string => {
    switch (status) {
      case 'completed':
        return '#22c55e';
      case 'downloading':
        return '#3b82f6';
      case 'paused':
        return '#f59e0b';
      case 'error':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusText = (status: OfflineRegion['status']): string => {
    switch (status) {
      case 'completed':
        return 'Downloaded';
      case 'downloading':
        return 'Downloading...';
      case 'paused':
        return 'Paused';
      case 'error':
        return 'Error';
      default:
        return 'Pending';
    }
  };

  const handleDownload = async () => {
    if (!festivalRegion) {
      Alert.alert('Error', 'No festival region specified');
      return;
    }

    const tileCount = calculateTileCount(
      festivalRegion,
      selectedZoomRange.min,
      selectedZoomRange.max
    );
    const sizeEstimate = estimateDownloadSize(tileCount);

    Alert.alert(
      'Download Offline Map',
      `This will download approximately ${tileCount} tiles (~${sizeEstimate}). Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Download',
          onPress: async () => {
            try {
              await downloadRegion(
                festivalName,
                festivalRegion,
                selectedZoomRange.min,
                selectedZoomRange.max
              );
              Alert.alert('Success', 'Map downloaded successfully!');
            } catch {
              Alert.alert('Error', 'Failed to download map');
            }
          },
        },
      ]
    );
  };

  const handleDelete = (region: OfflineRegion) => {
    Alert.alert('Delete Offline Map', `Are you sure you want to delete "${region.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteRegion(region.id),
      },
    ]);
  };

  const handleClearAll = () => {
    Alert.alert('Clear All Maps', 'This will delete all downloaded maps. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: clearCache,
      },
    ]);
  };

  const renderRegionItem = ({ item }: { item: OfflineRegion }) => (
    <View style={styles.regionItem}>
      <View style={styles.regionInfo}>
        <Text style={styles.regionName}>{item.name}</Text>
        <View style={styles.regionMeta}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
          <Text style={styles.regionSize}>{formatBytes(item.sizeBytes)}</Text>
        </View>
        {item.status === 'downloading' && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${item.progress}%` }]} />
          </View>
        )}
        <Text style={styles.regionDetails}>
          Zoom: {item.minZoom}-{item.maxZoom} | Tiles: {item.downloadedCount}/{item.tileCount}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDelete(item)}
        disabled={item.status === 'downloading'}
      >
        <Text style={styles.deleteButtonText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading offline maps...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Offline Maps</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Cache Info */}
      <View style={styles.cacheInfo}>
        <Text style={styles.cacheText}>
          Total cache size: <Text style={styles.cacheSizeValue}>{formatBytes(cacheSize)}</Text>
        </Text>
        {regions.length > 0 && (
          <TouchableOpacity onPress={handleClearAll}>
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Download New Region */}
      {festivalRegion && !isDownloading && (
        <View style={styles.downloadSection}>
          <Text style={styles.sectionTitle}>Download Festival Area</Text>

          <View style={styles.zoomSelector}>
            <Text style={styles.zoomLabel}>Detail Level:</Text>
            <View style={styles.zoomOptions}>
              <TouchableOpacity
                style={[
                  styles.zoomOption,
                  selectedZoomRange.max === 15 && styles.zoomOptionSelected,
                ]}
                onPress={() => setSelectedZoomRange({ min: 12, max: 15 })}
              >
                <Text
                  style={[
                    styles.zoomOptionText,
                    selectedZoomRange.max === 15 && styles.zoomOptionTextSelected,
                  ]}
                >
                  Low
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.zoomOption,
                  selectedZoomRange.max === 17 && styles.zoomOptionSelected,
                ]}
                onPress={() => setSelectedZoomRange({ min: 14, max: 17 })}
              >
                <Text
                  style={[
                    styles.zoomOptionText,
                    selectedZoomRange.max === 17 && styles.zoomOptionTextSelected,
                  ]}
                >
                  Medium
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.zoomOption,
                  selectedZoomRange.max === 18 && styles.zoomOptionSelected,
                ]}
                onPress={() => setSelectedZoomRange({ min: 15, max: 18 })}
              >
                <Text
                  style={[
                    styles.zoomOptionText,
                    selectedZoomRange.max === 18 && styles.zoomOptionTextSelected,
                  ]}
                >
                  High
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.estimateText}>
            Estimated size:{' '}
            {estimateDownloadSize(
              calculateTileCount(festivalRegion, selectedZoomRange.min, selectedZoomRange.max)
            )}
          </Text>

          <TouchableOpacity style={styles.downloadButton} onPress={handleDownload}>
            <Text style={styles.downloadButtonText}>Download Map</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Download Progress */}
      {isDownloading && currentDownload && (
        <View style={styles.downloadingSection}>
          <Text style={styles.downloadingTitle}>Downloading: {currentDownload.name}</Text>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${downloadProgress}%` }]} />
          </View>
          <Text style={styles.progressText}>{downloadProgress.toFixed(1)}% complete</Text>
          <TouchableOpacity style={styles.pauseButton} onPress={pauseDownload}>
            <Text style={styles.pauseButtonText}>Pause</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Downloaded Regions List */}
      <View style={styles.listSection}>
        <Text style={styles.sectionTitle}>Downloaded Maps</Text>
        {regions.length === 0 ? (
          <Text style={styles.emptyText}>No offline maps downloaded yet</Text>
        ) : (
          <FlatList
            data={regions}
            renderItem={renderRegionItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
  },
  cacheInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  cacheText: {
    fontSize: 14,
    color: '#6b7280',
  },
  cacheSizeValue: {
    fontWeight: '600',
    color: '#111827',
  },
  clearAllText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    margin: 16,
    padding: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  downloadSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  zoomSelector: {
    marginBottom: 16,
  },
  zoomLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  zoomOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  zoomOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  zoomOptionSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  zoomOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  zoomOptionTextSelected: {
    color: '#fff',
  },
  estimateText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  downloadButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  downloadingSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  downloadingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  progressContainer: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3b82f6',
  },
  progressText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 12,
  },
  pauseButton: {
    backgroundColor: '#f59e0b',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  pauseButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  listSection: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  listContent: {
    gap: 12,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 24,
  },
  regionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  regionInfo: {
    flex: 1,
  },
  regionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  regionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  regionSize: {
    fontSize: 12,
    color: '#6b7280',
  },
  regionDetails: {
    fontSize: 12,
    color: '#9ca3af',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 12,
  },
  deleteButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default OfflineMapManager;
