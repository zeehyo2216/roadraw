export type LatLng = {
  lat: number;
  lng: number;
};

export type GeneratedRoutePoint = LatLng & {
  elevation?: number | null;
  isUphillSegment?: boolean;
};

export type GeneratedRoute = {
  points: GeneratedRoutePoint[];
  estimatedDistanceKm: number;
  estimatedUphillGainM?: number;
};

/**
 * Simple geometric loop generator used as a fallback while
 * GraphHopper / maps routing is wired in.
 *
 * The idea:
 * - Approximate a circle around the current location
 * - Slightly distort it to feel more organic
 * - Return a list of lat/lng points that can be drawn as a polyline
 */
export function generateGeometricLoopRoute(options: {
  center: LatLng;
  distanceKm: number;
  segments?: number;
}): GeneratedRoute {
  const { center, distanceKm, segments = 32 } = options;

  const earthRadiusKm = 6371;
  const radiusKm = distanceKm / (2 * Math.PI);

  const latRadiusDeg = (radiusKm / earthRadiusKm) * (180 / Math.PI);
  const lngRadiusDeg =
    (radiusKm / earthRadiusKm) *
    (180 / Math.PI) /
    Math.cos((center.lat * Math.PI) / 180);

  const points: GeneratedRoutePoint[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = t * Math.PI * 2;

    const wobble =
      0.85 +
      0.3 * Math.sin(3 * angle + center.lat) +
      0.15 * Math.cos(5 * angle + center.lng);

    const lat = center.lat + Math.sin(angle) * latRadiusDeg * wobble;
    const lng = center.lng + Math.cos(angle) * lngRadiusDeg * wobble;

    points.push({ lat, lng, elevation: null, isUphillSegment: false });
  }

  return {
    points,
    estimatedDistanceKm: distanceKm,
    estimatedUphillGainM: 0,
  };
}

