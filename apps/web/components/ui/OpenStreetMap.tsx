'use client';

import { useEffect, useRef, useState } from 'react';

interface OpenStreetMapProps {
  location: string;
  className?: string;
}

// Location coordinates mapping
const locationCoordinates: Record<string, { lat: number; lng: number }> = {
  'Barcelona, Spain': { lat: 41.3851, lng: 2.1734 },
  'London, UK': { lat: 51.5074, lng: -0.1278 },
  'Paris, France': { lat: 48.8566, lng: 2.3522 },
  'Amsterdam, Netherlands': { lat: 52.3676, lng: 4.9041 },
  'Lisbon, Portugal': { lat: 38.7223, lng: -9.1393 },
  'Ibiza, Spain': { lat: 38.9067, lng: 1.4206 },
  'Nice, France': { lat: 43.7102, lng: 7.262 },
  'Berlin, Germany': { lat: 52.52, lng: 13.405 },
  'Milan, Italy': { lat: 45.4642, lng: 9.19 },
  // French cities for our festivals
  'La Rochelle': { lat: 46.1591, lng: -1.152 },
  'La Rochelle, France': { lat: 46.1591, lng: -1.152 },
  Chambord: { lat: 47.6161, lng: 1.5172 },
  'Chambord, France': { lat: 47.6161, lng: 1.5172 },
  // More French festival locations
  'Lyon, France': { lat: 45.764, lng: 4.8357 },
  'Marseille, France': { lat: 43.2965, lng: 5.3698 },
  'Bordeaux, France': { lat: 44.8378, lng: -0.5792 },
  'Toulouse, France': { lat: 43.6047, lng: 1.4442 },
  'Nantes, France': { lat: 47.2184, lng: -1.5536 },
  'Strasbourg, France': { lat: 48.5734, lng: 7.7521 },
  'Montpellier, France': { lat: 43.6108, lng: 3.8767 },
  'Rennes, France': { lat: 48.1173, lng: -1.6778 },
  'Lille, France': { lat: 50.6292, lng: 3.0573 },
};

export function OpenStreetMap({ location, className = '' }: OpenStreetMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const coords = locationCoordinates[location] || { lat: 48.8566, lng: 2.3522 }; // Default to Paris

  useEffect(() => {
    // Load Leaflet CSS
    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      link.crossOrigin = '';
      document.head.appendChild(link);
    }

    // Load Leaflet JS
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
        setError('Failed to load map');
        console.error('Leaflet loading error:', err);
      }
    };

    loadLeaflet();
  }, []);

  useEffect(() => {
    if (!isLoaded || !mapRef.current || typeof window === 'undefined' || !window.L) {
      return;
    }

    // Clear any existing map
    if ((mapRef.current as HTMLElement & { _leaflet_id?: number })._leaflet_id) {
      return;
    }

    const L = window.L;

    // Create map with better default options
    const map = L.map(mapRef.current, {
      center: [coords.lat, coords.lng],
      zoom: 14, // Slightly more zoomed in for better detail
      scrollWheelZoom: false, // Prevent accidental zoom when scrolling page
      zoomControl: true,
    });

    // Add OpenStreetMap tiles with better attribution
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    // Create custom icon for better visibility
    const customIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        width: 32px;
        height: 32px;
        background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
      "></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });

    // Add marker with custom icon
    const marker = L.marker([coords.lat, coords.lng], { icon: customIcon }).addTo(map);
    marker.bindPopup(
      `<div style="text-align: center; padding: 4px;">
        <strong style="color: #8B5CF6;">Festival Location</strong><br/>
        <span style="color: #666;">${location}</span>
      </div>`
    );

    // Center map on marker after a short delay to ensure proper rendering
    setTimeout(() => {
      map.invalidateSize();
      map.setView([coords.lat, coords.lng], 14);
    }, 100);

    // Cleanup
    return () => {
      map.remove();
    };
  }, [isLoaded, coords.lat, coords.lng, location]);

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

  if (!isLoaded) {
    return (
      <div className={`flex items-center justify-center bg-white/5 animate-pulse ${className}`}>
        <div className="text-center text-white/50">
          <div className="w-8 h-8 border-2 border-white/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm">Loading map...</p>
        </div>
      </div>
    );
  }

  return <div ref={mapRef} className={`${className}`} style={{ minHeight: '256px' }} />;
}

// Add Leaflet types to window
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    L: any;
  }
}

export default OpenStreetMap;
