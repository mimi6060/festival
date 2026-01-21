'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@festival/ui';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

// POI types with icons and colors
const POI_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  STAGE: { icon: '🎵', color: '#8B5CF6', label: 'Scenes' },
  FOOD: { icon: '🍔', color: '#F59E0B', label: 'Restauration' },
  DRINK: { icon: '🍺', color: '#3B82F6', label: 'Bars' },
  TOILET: { icon: '🚻', color: '#10B981', label: 'Toilettes' },
  MEDICAL: { icon: '🏥', color: '#EF4444', label: 'Medical' },
  INFO: { icon: 'ℹ️', color: '#6366F1', label: 'Info' },
  ATM: { icon: '💳', color: '#14B8A6', label: 'Distributeurs' },
  PARKING: { icon: '🅿️', color: '#64748B', label: 'Parking' },
  CAMPING: { icon: '⛺', color: '#84CC16', label: 'Camping' },
  ENTRANCE: { icon: '🚪', color: '#22C55E', label: 'Entrees' },
  EXIT: { icon: '🚶', color: '#EAB308', label: 'Sorties' },
  CHARGING: { icon: '🔌', color: '#A855F7', label: 'Recharge' },
  LOCKER: { icon: '🔐', color: '#78716C', label: 'Consignes' },
};

interface POI {
  id: string;
  name: string;
  type: string;
  description: string | null;
  latitude: number;
  longitude: number;
  isActive: boolean;
}

interface FestivalMapProps {
  festivalId: string;
  location: string;
  className?: string;
}

// Location coordinates mapping
const locationCoordinates: Record<string, { lat: number; lng: number }> = {
  'La Rochelle': { lat: 46.1591, lng: -1.152 },
  Chambord: { lat: 47.6161, lng: 1.5172 },
  'Paris, France': { lat: 48.8566, lng: 2.3522 },
  'Lyon, France': { lat: 45.764, lng: 4.8357 },
  'Barcelona, Spain': { lat: 41.3851, lng: 2.1734 },
};

export function FestivalMap({ festivalId, location, className = '' }: FestivalMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<ReturnType<typeof window.L.map> | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pois, setPois] = useState<POI[]>([]);
  const [loadingPois, setLoadingPois] = useState(true);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());

  // Get coordinates from location string
  const coords = locationCoordinates[location] || { lat: 48.8566, lng: 2.3522 };

  // Fetch POIs from API
  useEffect(() => {
    async function fetchPOIs() {
      try {
        setLoadingPois(true);
        const res = await fetch(`${API_BASE_URL}/festivals/${festivalId}/pois`);
        if (!res.ok) throw new Error('Failed to fetch POIs');
        const data = await res.json();
        const poiList = data.data || data;
        setPois(poiList.filter((poi: POI) => poi.isActive));
      } catch (err) {
        console.error('Error fetching POIs:', err);
      } finally {
        setLoadingPois(false);
      }
    }

    if (festivalId) {
      fetchPOIs();
    }
  }, [festivalId]);

  // Get unique POI types
  const poiTypes = Array.from(new Set(pois.map((poi) => poi.type)));

  // Filter POIs based on active filters
  const filteredPois =
    activeFilters.size === 0 ? pois : pois.filter((poi) => activeFilters.has(poi.type));

  // Toggle filter
  const toggleFilter = useCallback((type: string) => {
    setActiveFilters((prev) => {
      const newFilters = new Set(prev);
      if (newFilters.has(type)) {
        newFilters.delete(type);
      } else {
        newFilters.add(type);
      }
      return newFilters;
    });
  }, []);

  // Load Leaflet
  useEffect(() => {
    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      link.crossOrigin = '';
      document.head.appendChild(link);
    }

    const loadLeaflet = async () => {
      try {
        if (typeof window !== 'undefined' && !window.L) {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
          script.crossOrigin = '';

          await new Promise<void>((resolve, reject) => {
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Leaflet'));
            document.head.appendChild(script);
          });
        }
        setIsLoaded(true);
      } catch (err) {
        setError('Impossible de charger la carte');
        console.error('Leaflet loading error:', err);
      }
    };

    loadLeaflet();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || typeof window === 'undefined' || !window.L) {
      return;
    }

    // Clear any existing map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const L = window.L;

    // Create map
    const map = L.map(mapRef.current, {
      center: [coords.lat, coords.lng],
      zoom: 15,
      scrollWheelZoom: false,
      zoomControl: true,
    });

    mapInstanceRef.current = map;

    // Add tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    // Add center marker
    const festivalIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
        border-radius: 50%;
        border: 4px solid white;
        box-shadow: 0 4px 12px rgba(139, 92, 246, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
      ">🎪</div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20],
    });

    L.marker([coords.lat, coords.lng], { icon: festivalIcon })
      .addTo(map)
      .bindPopup(
        `<div style="text-align: center; padding: 8px;">
        <strong style="color: #8B5CF6; font-size: 14px;">Festival</strong><br/>
        <span style="color: #666; font-size: 12px;">${location}</span>
      </div>`
      );

    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isLoaded, coords.lat, coords.lng, location]);

  // Add POI markers
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L || filteredPois.length === 0) return;

    const L = window.L;
    const map = mapInstanceRef.current;

    // Clear existing POI markers (keep only festival marker)
    map.eachLayer((layer: { options?: { isPoi?: boolean }; remove: () => void }) => {
      if (layer.options?.isPoi) {
        layer.remove();
      }
    });

    // Add POI markers
    filteredPois.forEach((poi) => {
      const config = POI_CONFIG[poi.type] || { icon: '📍', color: '#6B7280', label: poi.type };

      const poiIcon = L.divIcon({
        className: 'poi-marker',
        html: `<div style="
          width: 32px;
          height: 32px;
          background: ${config.color};
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        ">${config.icon}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
      });

      L.marker([poi.latitude, poi.longitude], { icon: poiIcon, isPoi: true })
        .addTo(map)
        .bindPopup(
          `<div style="padding: 4px;">
          <strong style="color: ${config.color};">${poi.name}</strong><br/>
          <span style="color: #666; font-size: 11px;">${config.label}</span>
        </div>`
        );
    });
  }, [filteredPois]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-white/5 ${className}`}>
        <div className="text-center text-white/50">
          <svg
            className="w-12 h-12 mx-auto mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* POI Filters */}
      {poiTypes.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {poiTypes.map((type) => {
              const config = POI_CONFIG[type] || { icon: '📍', color: '#6B7280', label: type };
              const isActive = activeFilters.size === 0 || activeFilters.has(type);
              const count = pois.filter((poi) => poi.type === type).length;

              return (
                <button
                  key={type}
                  onClick={() => toggleFilter(type)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-white/20 text-white border border-white/30'
                      : 'bg-white/5 text-white/40 border border-transparent'
                  }`}
                >
                  <span>{config.icon}</span>
                  <span>{config.label}</span>
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                      isActive ? 'bg-white/20' : 'bg-white/10'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Map */}
      <Card variant="solid" padding="none" className="overflow-hidden">
        {!isLoaded ? (
          <div className="h-80 flex items-center justify-center bg-white/5">
            <Spinner size="lg" />
          </div>
        ) : (
          <div ref={mapRef} className="h-80" style={{ minHeight: '320px' }} />
        )}

        {/* Legend and Address */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-primary-400 mt-0.5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <div className="flex-1">
              <h3 className="font-semibold text-white">{location}</h3>
              <div className="flex items-center gap-4 mt-2 text-sm text-white/60">
                <span>{pois.length} points d&apos;interet</span>
                {loadingPois && <span className="text-primary-400">Chargement...</span>}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Leaflet types
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    L: any;
  }
}

export default FestivalMap;
