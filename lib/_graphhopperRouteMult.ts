import type { LatLng, GeneratedRoute, GeneratedRoutePoint } from "./loopRoute";

export type RouteOption = GeneratedRoute & {
    id: string;
    name: string;
    totalTime: number; // seconds
    ascend: number; // meters
    descend: number; // meters
};

type GraphHopperResponse = {
    paths: Array<{
        distance: number;
        time: number;
        ascend: number;
        descend: number;
        points: {
            coordinates: [number, number, number?][]; // [lng, lat, elevation?]
        };
    }>;
};

/**
 * Decode GraphHopper's encoded polyline with optional elevation
 */
function decodePolyline(encoded: string, includeElevation = false): GeneratedRoutePoint[] {
    const points: GeneratedRoutePoint[] = [];
    let index = 0;
    let lat = 0;
    let lng = 0;
    let ele = 0;

    while (index < encoded.length) {
        // Decode latitude
        let shift = 0;
        let result = 0;
        let byte: number;
        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);
        lat += result & 1 ? ~(result >> 1) : result >> 1;

        // Decode longitude
        shift = 0;
        result = 0;
        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);
        lng += result & 1 ? ~(result >> 1) : result >> 1;

        // Decode elevation if present
        if (includeElevation && index < encoded.length) {
            shift = 0;
            result = 0;
            do {
                byte = encoded.charCodeAt(index++) - 63;
                result |= (byte & 0x1f) << shift;
                shift += 5;
            } while (byte >= 0x20);
            ele += result & 1 ? ~(result >> 1) : result >> 1;
        }

        points.push({
            lat: lat / 1e5,
            lng: lng / 1e5,
            elevation: includeElevation ? ele / 100 : null,
        });
    }

    return points;
}

/**
 * Generate multiple loop route options using GraphHopper round_trip algorithm
 * Optimized for reliability - tries multiple distance factors and retries with shorter distances
 */
export async function generateLoopRoutes(options: {
    center: LatLng;
    distanceKm: number;
    count?: number; // number of route options to generate
}): Promise<RouteOption[]> {
    const { center, distanceKm, count = 3 } = options;
    const apiKey = process.env.GRAPHHOPPER_API_KEY;

    if (!apiKey || apiKey === "YOUR_GRAPHHOPPER_KEY") {
        console.warn("GraphHopper API key not configured, using fallback");
        return generateFallbackRoutes(center, distanceKm, count);
    }

    // Try to get routes. If first attempt fails, retry with progressively smaller distances.
    const distanceAttempts = [distanceKm, distanceKm * 0.8, distanceKm * 0.6];

    for (const attemptDistance of distanceAttempts) {
        const routes = await tryGenerateRoutes(center, attemptDistance, count, apiKey);
        if (routes.length > 0) {
            console.log(`Successfully generated ${routes.length} routes for ~${attemptDistance.toFixed(1)}km`);
            return routes;
        }
        console.warn(`No routes found for ${attemptDistance.toFixed(1)}km, trying shorter distance...`);
    }

    // If all attempts failed, use fallback
    console.warn("All GraphHopper attempts failed, using geometric fallback");
    return generateFallbackRoutes(center, distanceKm, count);
}

/**
 * Internal function to attempt route generation for a specific distance
 */
async function tryGenerateRoutes(
    center: LatLng,
    distanceKm: number,
    count: number,
    apiKey: string
): Promise<RouteOption[]> {
    const distanceMeters = distanceKm * 1000;

    // Strategy: Make many parallel requests with varying distance factors and seeds
    // GraphHopper's round_trip.distance is approximate (beeline, not actual path length)
    // So we try a wide range of factors to maximize chance of success
    const attempts = [
        // Core attempts around target distance
        { factor: 1.0, seedOffset: 0 },
        { factor: 1.0, seedOffset: 1000 },
        { factor: 1.0, seedOffset: 2000 },
        // Slightly larger (GraphHopper often returns shorter than requested)
        { factor: 1.2, seedOffset: 100 },
        { factor: 1.3, seedOffset: 200 },
        { factor: 1.4, seedOffset: 300 },
        { factor: 1.5, seedOffset: 400 },
        // Slightly smaller
        { factor: 0.9, seedOffset: 500 },
        { factor: 0.8, seedOffset: 600 },
        { factor: 0.7, seedOffset: 700 },
        // Extreme factors for difficult areas
        { factor: 1.8, seedOffset: 800 },
        { factor: 2.0, seedOffset: 900 },
    ];

    const promises = attempts.map(async (attempt) => {
        try {
            const seed = Math.floor(Math.random() * 100000) + attempt.seedOffset;
            const targetDistance = Math.round(distanceMeters * attempt.factor);

            const params = new URLSearchParams({
                key: apiKey,
                point: `${center.lat},${center.lng}`,
                profile: "foot",
                algorithm: "round_trip",
                "round_trip.distance": targetDistance.toString(),
                "round_trip.seed": seed.toString(),
                elevation: "true",
                points_encoded: "false",
                locale: "ko",
            });

            const response = await fetch(
                `https://graphhopper.com/api/1/route?${params.toString()}`
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.warn(`GraphHopper request failed (factor ${attempt.factor}): ${response.status} - ${errorText.substring(0, 100)}`);
                return null;
            }

            const data: GraphHopperResponse = await response.json();
            if (data.paths && data.paths.length > 0) {
                return data.paths[0];
            }
        } catch (error) {
            console.error(`Attempt with factor ${attempt.factor} failed:`, error);
        }
        return null;
    });

    // Wait for all requests to complete
    const results = await Promise.all(promises);

    // Filter valid results
    const validPaths = results.filter((path): path is NonNullable<typeof path> => path !== null);

    if (validPaths.length === 0) {
        return [];
    }

    // Process and score paths
    const candidateRoutes: RouteOption[] = validPaths.map((path, index) => {
        const points: GeneratedRoutePoint[] = path.points.coordinates.map(
            ([lng, lat, elevation]) => ({
                lat,
                lng,
                elevation: elevation ?? null,
            })
        );

        const actualDistanceKm = path.distance / 1000;

        return {
            id: `route-${index}`,
            name: "",
            points,
            estimatedDistanceKm: actualDistanceKm,
            estimatedUphillGainM: path.ascend,
            totalTime: path.time / 1000,
            ascend: path.ascend,
            descend: path.descend,
        };
    });

    // Remove duplicates (based on very similar distance and ascend)
    const uniqueRoutes: RouteOption[] = [];
    candidateRoutes.forEach(route => {
        const isDuplicate = uniqueRoutes.some(existing =>
            Math.abs(existing.estimatedDistanceKm - route.estimatedDistanceKm) < 0.1 && // < 100m diff
            Math.abs(existing.ascend - route.ascend) < 10 // < 10m diff
        );
        if (!isDuplicate) {
            uniqueRoutes.push(route);
        }
    });

    // Sort by accuracy (closeness to target distance)
    // Prefer routes that are LONGER than target over routes that are much shorter
    uniqueRoutes.sort((a, b) => {
        const diffA = Math.abs(a.estimatedDistanceKm - distanceKm);
        const diffB = Math.abs(b.estimatedDistanceKm - distanceKm);
        return diffA - diffB;
    });

    // Select top N routes
    const topRoutes = uniqueRoutes.slice(0, count);

    // Assign final IDs and Names
    return topRoutes.map((route, i) => ({
        ...route,
        id: `route-opt-${i + 1}`,
        name: getRouteName(i, route.ascend),
    }));
}

/**
 * Generate route name based on characteristics
 */
function getRouteName(index: number, ascend: number): string {
    if (index === 0 || ascend < 20) {
        return "평지 코스";
    } else if (ascend < 50) {
        return "완만한 코스";
    } else {
        return "도전 코스";
    }
}

/**
 * Fallback: Generate geometric loop routes when API is unavailable
 * The route starts and ends at the current location (center), not around it
 */
function generateFallbackRoutes(
    center: LatLng,
    distanceKm: number,
    count: number
): RouteOption[] {
    const routes: RouteOption[] = [];

    for (let i = 0; i < count; i++) {
        const variation = 0.95 + i * 0.05; // 0.95, 1.0, 1.05
        const adjustedDistance = distanceKm * variation;

        // Calculate radius so that the route circumference equals target distance
        const earthRadiusKm = 6371;
        const radiusKm = adjustedDistance / (2 * Math.PI);
        const latRadiusDeg = (radiusKm / earthRadiusKm) * (180 / Math.PI);
        const lngRadiusDeg =
            (radiusKm / earthRadiusKm) *
            (180 / Math.PI) /
            Math.cos((center.lat * Math.PI) / 180);

        const points: GeneratedRoutePoint[] = [];
        const segments = 40;

        // Direction offset for each route (different directions)
        const directionOffset = (i * 2 * Math.PI) / 3; // 0°, 120°, 240°

        // Calculate the circle center so that current location is ON the circle
        // The center of the circle is offset from current location by the radius
        const circleCenterLat = center.lat - Math.sin(directionOffset) * latRadiusDeg;
        const circleCenterLng = center.lng - Math.cos(directionOffset) * lngRadiusDeg;

        for (let j = 0; j <= segments; j++) {
            const t = j / segments;
            const angle = t * Math.PI * 2 + directionOffset;

            // Add some natural wobble to make it feel less geometric
            const wobble = 0.92 + 0.16 * Math.sin(3 * angle + i);

            const lat = circleCenterLat + Math.sin(angle) * latRadiusDeg * wobble;
            const lng = circleCenterLng + Math.cos(angle) * lngRadiusDeg * wobble;

            points.push({ lat, lng, elevation: null });
        }

        // Ensure the first point is exactly the current location
        points[0] = { lat: center.lat, lng: center.lng, elevation: null };
        // Ensure the last point is also the current location (loop closure)
        points[points.length - 1] = { lat: center.lat, lng: center.lng, elevation: null };

        const estimatedTime = adjustedDistance * 12 * 60; // ~12 min/km walking

        routes.push({
            id: `fallback-${i + 1}`,
            name: i === 0 ? "추천 코스" : `코스 ${i + 1}`,
            points,
            estimatedDistanceKm: adjustedDistance,
            estimatedUphillGainM: 0,
            totalTime: estimatedTime,
            ascend: 0,
            descend: 0,
        });
    }

    return routes;
}
