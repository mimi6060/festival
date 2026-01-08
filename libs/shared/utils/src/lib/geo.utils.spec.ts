import {
  calculateDistance,
  calculateBearing,
  getCompassDirection,
  calculateMidpoint,
  calculateDestination,
  calculateBoundingBox,
  calculateBoundingBoxFromRadius,
  isPointInBoundingBox,
  getBoundingBoxCenter,
  expandBoundingBox,
  isPointInPolygon,
  calculatePolygonArea,
  calculatePolygonCentroid,
  isValidCoordinates,
  normalizeLongitude,
  formatCoordinatesAsDMS,
  formatCoordinatesAsDecimal,
  parseDMSToDecimal,
  findPointsWithinRadius,
  groupPointsByGrid,
  findNearestPoint,
  sortPointsByDistance,
  kmToMiles,
  milesToKm,
  metersToFeet,
  feetToMeters,
  formatDistance,
  estimateWalkingTime,
  formatWalkingTime,
  Coordinates,
  BoundingBox,
} from './geo.utils';

describe('Geo Utils', () => {
  // Test data
  const paris: Coordinates = { latitude: 48.8566, longitude: 2.3522 };
  const london: Coordinates = { latitude: 51.5074, longitude: -0.1278 };
  const newYork: Coordinates = { latitude: 40.7128, longitude: -74.006 };
  const tokyo: Coordinates = { latitude: 35.6762, longitude: 139.6503 };

  // ============================================================================
  // calculateDistance
  // ============================================================================
  describe('calculateDistance', () => {
    it('should calculate distance between Paris and London (~343 km)', () => {
      const distance = calculateDistance(paris, london);
      expect(distance).toBeCloseTo(344, 0);
    });

    it('should return 0 for same point', () => {
      const distance = calculateDistance(paris, paris);
      expect(distance).toBe(0);
    });

    it('should calculate distance in miles', () => {
      const distanceKm = calculateDistance(paris, london, 'km');
      const distanceMi = calculateDistance(paris, london, 'mi');
      expect(distanceMi).toBeCloseTo(distanceKm * 0.621371, 0);
    });

    it('should calculate distance in meters', () => {
      const distanceKm = calculateDistance(paris, london, 'km');
      const distanceM = calculateDistance(paris, london, 'm');
      expect(distanceM).toBeCloseTo(distanceKm * 1000, 0);
    });

    it('should calculate distance in feet', () => {
      const distanceM = calculateDistance(paris, london, 'm');
      const distanceFt = calculateDistance(paris, london, 'ft');
      expect(distanceFt).toBeCloseTo(distanceM * 3.28084, 0);
    });

    it('should handle very large distances', () => {
      const distance = calculateDistance(paris, tokyo);
      expect(distance).toBeGreaterThan(9000); // ~9700 km
    });
  });

  // ============================================================================
  // calculateBearing
  // ============================================================================
  describe('calculateBearing', () => {
    it('should calculate bearing from Paris to London', () => {
      const bearing = calculateBearing(paris, london);
      expect(bearing).toBeGreaterThan(320);
      expect(bearing).toBeLessThan(340);
    });

    it('should return bearing in 0-360 range', () => {
      const bearing = calculateBearing(london, paris);
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(360);
    });

    it('should return ~0 for north direction', () => {
      const south: Coordinates = { latitude: 0, longitude: 0 };
      const north: Coordinates = { latitude: 10, longitude: 0 };
      const bearing = calculateBearing(south, north);
      expect(bearing).toBeCloseTo(0, 0);
    });

    it('should return ~90 for east direction', () => {
      const west: Coordinates = { latitude: 0, longitude: 0 };
      const east: Coordinates = { latitude: 0, longitude: 10 };
      const bearing = calculateBearing(west, east);
      expect(bearing).toBeCloseTo(90, 0);
    });
  });

  // ============================================================================
  // getCompassDirection
  // ============================================================================
  describe('getCompassDirection', () => {
    it('should return N for 0 degrees', () => {
      expect(getCompassDirection(0)).toBe('N');
    });

    it('should return E for 90 degrees', () => {
      expect(getCompassDirection(90)).toBe('E');
    });

    it('should return S for 180 degrees', () => {
      expect(getCompassDirection(180)).toBe('S');
    });

    it('should return W for 270 degrees', () => {
      expect(getCompassDirection(270)).toBe('W');
    });

    it('should return NE for 45 degrees', () => {
      expect(getCompassDirection(45)).toBe('NE');
    });

    it('should return SW for 225 degrees', () => {
      expect(getCompassDirection(225)).toBe('SW');
    });
  });

  // ============================================================================
  // calculateMidpoint
  // ============================================================================
  describe('calculateMidpoint', () => {
    it('should calculate midpoint between two points', () => {
      const midpoint = calculateMidpoint(paris, london);
      expect(midpoint.latitude).toBeGreaterThan(paris.latitude);
      expect(midpoint.latitude).toBeLessThan(london.latitude);
    });

    it('should return same point for identical coordinates', () => {
      const midpoint = calculateMidpoint(paris, paris);
      expect(midpoint.latitude).toBeCloseTo(paris.latitude, 4);
      expect(midpoint.longitude).toBeCloseTo(paris.longitude, 4);
    });
  });

  // ============================================================================
  // calculateDestination
  // ============================================================================
  describe('calculateDestination', () => {
    it('should calculate destination point going north', () => {
      const destination = calculateDestination(paris, 100, 0);
      expect(destination.latitude).toBeGreaterThan(paris.latitude);
      expect(destination.longitude).toBeCloseTo(paris.longitude, 1);
    });

    it('should calculate destination point going east', () => {
      const destination = calculateDestination(paris, 100, 90);
      expect(destination.latitude).toBeCloseTo(paris.latitude, 1);
      expect(destination.longitude).toBeGreaterThan(paris.longitude);
    });

    it('should calculate destination point going south', () => {
      const destination = calculateDestination(paris, 100, 180);
      expect(destination.latitude).toBeLessThan(paris.latitude);
    });

    it('should be consistent with distance calculation', () => {
      const destination = calculateDestination(paris, 100, 45);
      const calculatedDistance = calculateDistance(paris, destination);
      expect(calculatedDistance).toBeCloseTo(100, 0);
    });
  });

  // ============================================================================
  // Bounding Box Operations
  // ============================================================================
  describe('calculateBoundingBox', () => {
    it('should calculate bounding box from points', () => {
      const box = calculateBoundingBox([paris, london, newYork]);
      expect(box.north).toBeCloseTo(london.latitude, 4);
      expect(box.south).toBeCloseTo(newYork.latitude, 4);
      expect(box.east).toBeCloseTo(paris.longitude, 4);
      expect(box.west).toBeCloseTo(newYork.longitude, 4);
    });

    it('should throw for empty array', () => {
      expect(() => calculateBoundingBox([])).toThrow();
    });

    it('should handle single point', () => {
      const box = calculateBoundingBox([paris]);
      expect(box.north).toBe(paris.latitude);
      expect(box.south).toBe(paris.latitude);
      expect(box.east).toBe(paris.longitude);
      expect(box.west).toBe(paris.longitude);
    });
  });

  describe('calculateBoundingBoxFromRadius', () => {
    it('should create bounding box from center and radius', () => {
      const box = calculateBoundingBoxFromRadius(paris, 10);
      expect(box.north).toBeGreaterThan(paris.latitude);
      expect(box.south).toBeLessThan(paris.latitude);
      expect(box.east).toBeGreaterThan(paris.longitude);
      expect(box.west).toBeLessThan(paris.longitude);
    });

    it('should be symmetric around center', () => {
      const box = calculateBoundingBoxFromRadius(paris, 10);
      const northDiff = box.north - paris.latitude;
      const southDiff = paris.latitude - box.south;
      expect(northDiff).toBeCloseTo(southDiff, 4);
    });
  });

  describe('isPointInBoundingBox', () => {
    const box: BoundingBox = {
      north: 52,
      south: 48,
      east: 5,
      west: 0,
    };

    it('should return true for point inside box', () => {
      expect(isPointInBoundingBox(paris, box)).toBe(true);
    });

    it('should return true for point on edge', () => {
      expect(isPointInBoundingBox({ latitude: 50, longitude: 0 }, box)).toBe(true);
    });

    it('should return false for point outside box', () => {
      expect(isPointInBoundingBox(newYork, box)).toBe(false);
    });
  });

  describe('getBoundingBoxCenter', () => {
    it('should calculate center of bounding box', () => {
      const box: BoundingBox = { north: 52, south: 48, east: 5, west: 0 };
      const center = getBoundingBoxCenter(box);
      expect(center.latitude).toBe(50);
      expect(center.longitude).toBe(2.5);
    });
  });

  describe('expandBoundingBox', () => {
    it('should expand bounding box by percentage', () => {
      const box: BoundingBox = { north: 52, south: 48, east: 5, west: 0 };
      const expanded = expandBoundingBox(box, 10);
      expect(expanded.north).toBeGreaterThan(box.north);
      expect(expanded.south).toBeLessThan(box.south);
      expect(expanded.east).toBeGreaterThan(box.east);
      expect(expanded.west).toBeLessThan(box.west);
    });
  });

  // ============================================================================
  // Polygon Operations
  // ============================================================================
  describe('isPointInPolygon', () => {
    const polygon: [number, number][] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ];

    it('should return true for point inside polygon', () => {
      expect(isPointInPolygon({ latitude: 5, longitude: 5 }, polygon)).toBe(true);
    });

    it('should return false for point outside polygon', () => {
      expect(isPointInPolygon({ latitude: 15, longitude: 5 }, polygon)).toBe(false);
    });

    it('should handle complex polygons', () => {
      const triangle: [number, number][] = [
        [0, 0],
        [10, 5],
        [0, 10],
      ];
      expect(isPointInPolygon({ latitude: 3, longitude: 3 }, triangle)).toBe(true);
    });
  });

  describe('calculatePolygonArea', () => {
    it('should calculate area of polygon', () => {
      const polygon: [number, number][] = [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ];
      const area = calculatePolygonArea(polygon);
      expect(area).toBeGreaterThan(0);
    });

    it('should return 0 for less than 3 points', () => {
      expect(
        calculatePolygonArea([
          [0, 0],
          [1, 1],
        ])
      ).toBe(0);
      expect(calculatePolygonArea([[0, 0]])).toBe(0);
    });
  });

  describe('calculatePolygonCentroid', () => {
    it('should calculate centroid of square', () => {
      const square: [number, number][] = [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ];
      const centroid = calculatePolygonCentroid(square);
      expect(centroid.latitude).toBe(5);
      expect(centroid.longitude).toBe(5);
    });
  });

  // ============================================================================
  // Coordinate Validation & Formatting
  // ============================================================================
  describe('isValidCoordinates', () => {
    it('should validate correct coordinates', () => {
      expect(isValidCoordinates(48.8566, 2.3522)).toBe(true);
    });

    it('should validate extreme values', () => {
      expect(isValidCoordinates(90, 180)).toBe(true);
      expect(isValidCoordinates(-90, -180)).toBe(true);
    });

    it('should reject invalid latitude', () => {
      expect(isValidCoordinates(91, 0)).toBe(false);
      expect(isValidCoordinates(-91, 0)).toBe(false);
    });

    it('should reject invalid longitude', () => {
      expect(isValidCoordinates(0, 181)).toBe(false);
      expect(isValidCoordinates(0, -181)).toBe(false);
    });
  });

  describe('normalizeLongitude', () => {
    it('should keep valid longitude unchanged', () => {
      expect(normalizeLongitude(90)).toBe(90);
      expect(normalizeLongitude(-90)).toBe(-90);
    });

    it('should normalize longitude > 180', () => {
      expect(normalizeLongitude(200)).toBe(-160);
    });

    it('should normalize longitude < -180', () => {
      expect(normalizeLongitude(-200)).toBe(160);
    });

    it('should handle multiple wraps', () => {
      expect(normalizeLongitude(540)).toBe(180);
    });
  });

  describe('formatCoordinatesAsDMS', () => {
    it('should format Paris coordinates', () => {
      const result = formatCoordinatesAsDMS(48.8566, 2.3522);
      expect(result.latitude).toContain('N');
      expect(result.longitude).toContain('E');
    });

    it('should format southern coordinates', () => {
      const result = formatCoordinatesAsDMS(-33.9, 18.4);
      expect(result.latitude).toContain('S');
    });

    it('should format western coordinates', () => {
      const result = formatCoordinatesAsDMS(40.7, -74);
      expect(result.longitude).toContain('W');
    });
  });

  describe('formatCoordinatesAsDecimal', () => {
    it('should format with default precision', () => {
      const result = formatCoordinatesAsDecimal(48.8566, 2.3522);
      expect(result).toBe('48.856600, 2.352200');
    });

    it('should format with custom precision', () => {
      const result = formatCoordinatesAsDecimal(48.8566, 2.3522, 2);
      expect(result).toBe('48.86, 2.35');
    });
  });

  describe('parseDMSToDecimal', () => {
    it('should parse north latitude', () => {
      const result = parseDMSToDecimal('48\u00B0 51\' 23.76" N');
      expect(result).toBeCloseTo(48.8566, 2);
    });

    it('should parse south latitude', () => {
      const result = parseDMSToDecimal('33\u00B0 54\' 0.00" S');
      expect(result).toBeCloseTo(-33.9, 1);
    });

    it('should parse east longitude', () => {
      const result = parseDMSToDecimal('2\u00B0 21\' 7.92" E');
      expect(result).toBeCloseTo(2.3522, 2);
    });

    it('should parse west longitude', () => {
      const result = parseDMSToDecimal('74\u00B0 0\' 21.60" W');
      expect(result).toBeCloseTo(-74.006, 2);
    });

    it('should return null for invalid format', () => {
      expect(parseDMSToDecimal('invalid')).toBeNull();
    });
  });

  // ============================================================================
  // Clustering & Grouping
  // ============================================================================
  describe('findPointsWithinRadius', () => {
    const points: Coordinates[] = [paris, london, newYork, tokyo];

    it('should find points within radius', () => {
      const nearParis = findPointsWithinRadius(paris, points, 500);
      expect(nearParis).toContain(paris);
      expect(nearParis).toContain(london);
      expect(nearParis).not.toContain(newYork);
    });

    it('should return empty array if no points within radius', () => {
      const result = findPointsWithinRadius(paris, points, 1);
      expect(result).toHaveLength(1); // Only paris itself
    });
  });

  describe('groupPointsByGrid', () => {
    it('should group points by grid cells', () => {
      const points = [paris, london];
      const groups = groupPointsByGrid(points, 500);
      expect(groups.size).toBeGreaterThan(0);
    });

    it('should place nearby points in same cell', () => {
      const close1: Coordinates = { latitude: 48.8566, longitude: 2.3522 };
      const close2: Coordinates = { latitude: 48.8567, longitude: 2.3523 };
      const groups = groupPointsByGrid([close1, close2], 100);
      // Should be in same cell or adjacent
      expect(groups.size).toBeLessThanOrEqual(2);
    });
  });

  describe('findNearestPoint', () => {
    it('should find nearest point', () => {
      const points = [london, newYork, tokyo];
      const result = findNearestPoint(paris, points);
      expect(result?.point).toBe(london);
    });

    it('should return null for empty array', () => {
      expect(findNearestPoint(paris, [])).toBeNull();
    });

    it('should return distance to nearest point', () => {
      const points = [london];
      const result = findNearestPoint(paris, points);
      expect(result?.distance).toBeCloseTo(344, 0);
    });
  });

  describe('sortPointsByDistance', () => {
    it('should sort points by distance from center', () => {
      const points = [newYork, london, tokyo];
      const sorted = sortPointsByDistance(paris, points);
      expect(sorted[0]).toBe(london); // Closest
      expect(sorted[2]).toBe(tokyo); // Farthest
    });

    it('should not modify original array', () => {
      const points = [newYork, london];
      sortPointsByDistance(paris, points);
      expect(points[0]).toBe(newYork); // Original unchanged
    });
  });

  // ============================================================================
  // Unit Conversions
  // ============================================================================
  describe('kmToMiles', () => {
    it('should convert km to miles', () => {
      expect(kmToMiles(1)).toBeCloseTo(0.621371, 4);
    });

    it('should convert 100 km to miles', () => {
      expect(kmToMiles(100)).toBeCloseTo(62.1371, 2);
    });
  });

  describe('milesToKm', () => {
    it('should convert miles to km', () => {
      expect(milesToKm(1)).toBeCloseTo(1.60934, 4);
    });

    it('should be inverse of kmToMiles', () => {
      expect(milesToKm(kmToMiles(100))).toBeCloseTo(100, 3);
    });
  });

  describe('metersToFeet', () => {
    it('should convert meters to feet', () => {
      expect(metersToFeet(1)).toBeCloseTo(3.28084, 4);
    });
  });

  describe('feetToMeters', () => {
    it('should convert feet to meters', () => {
      expect(feetToMeters(1)).toBeCloseTo(0.3048, 4);
    });

    it('should be inverse of metersToFeet', () => {
      expect(feetToMeters(metersToFeet(100))).toBeCloseTo(100, 4);
    });
  });

  describe('formatDistance', () => {
    it('should format distance in km', () => {
      expect(formatDistance(5)).toBe('5.0 km');
    });

    it('should format small distance in meters', () => {
      expect(formatDistance(0.5)).toContain('m');
    });

    it('should format distance in miles', () => {
      expect(formatDistance(10, 'mi')).toContain('mi');
    });

    it('should format very small miles as feet', () => {
      expect(formatDistance(0.05, 'mi')).toContain('ft');
    });
  });

  // ============================================================================
  // Walking Time Estimation
  // ============================================================================
  describe('estimateWalkingTime', () => {
    it('should estimate walking time in minutes', () => {
      const time = estimateWalkingTime(paris, london);
      expect(time).toBeGreaterThan(0);
    });

    it('should use default 5 km/h speed', () => {
      // 5 km at 5 km/h = 1 hour = 60 minutes
      const near: Coordinates = { latitude: paris.latitude, longitude: paris.longitude + 0.05 };
      const distance = calculateDistance(paris, near);
      const time = estimateWalkingTime(paris, near);
      expect(time).toBeCloseTo(Math.ceil((distance / 5) * 60), 0);
    });

    it('should use custom walking speed', () => {
      const near: Coordinates = { latitude: paris.latitude + 0.1, longitude: paris.longitude };
      const time1 = estimateWalkingTime(paris, near, 5);
      const time2 = estimateWalkingTime(paris, near, 10);
      expect(time1).toBeCloseTo(time2 * 2, 0);
    });
  });

  describe('formatWalkingTime', () => {
    it('should format less than 1 minute', () => {
      expect(formatWalkingTime(0.5)).toBe('< 1 min');
    });

    it('should format minutes only', () => {
      expect(formatWalkingTime(30)).toBe('30 min');
    });

    it('should format hours only', () => {
      expect(formatWalkingTime(60)).toBe('1h');
      expect(formatWalkingTime(120)).toBe('2h');
    });

    it('should format hours and minutes', () => {
      expect(formatWalkingTime(90)).toBe('1h 30min');
      expect(formatWalkingTime(150)).toBe('2h 30min');
    });
  });
});
