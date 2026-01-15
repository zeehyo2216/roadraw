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

    const routes: RouteOption[] = [];
    const distanceMeters = distanceKm * 1000;

    // Generate multiple routes with different seeds
    for (let i = 0; i < count; i++) {
        try {
            const seed = Math.floor(Math.random() * 1000000) + i * 12345;

            const params = new URLSearchParams({
                point: `${center.lat},${center.lng}`,
                profile: "foot",
                algorithm: "round_trip",
                "round_trip.distance": distanceMeters.toString(),
                "round_trip.seed": seed.toString(),
                elevation: "true",
                points_encoded: "false",
                locale: "ko",
            });

            const response = await fetch(
                `https://graphhopper.com/api/1/route?${params.toString()}`,
                {
                    headers: {
                        Authorization: apiKey,
                    },
                }
            );

            if (!response.ok) {
                console.error(`GraphHopper API error: ${response.status}`);
                continue;
            }

            const data: GraphHopperResponse = await response.json();

            if (data.paths && data.paths.length > 0) {
                const path = data.paths[0];

                const points: GeneratedRoutePoint[] = path.points.coordinates.map(
                    ([lng, lat, elevation]) => ({
                        lat,
                        lng,
                        elevation: elevation ?? null,
                    })
                );

                routes.push({
                    id: `route-${i + 1}`,
                    name: getRouteName(i, path.ascend),
                    points,
                    estimatedDistanceKm: path.distance / 1000,
                    estimatedUphillGainM: path.ascend,
                    totalTime: path.time / 1000, // convert to seconds
                    ascend: path.ascend,
                    descend: path.descend,
                });
            }
        } catch (error) {
            console.error(`Failed to generate route ${i + 1}:`, error);
        }
    }

    // Sort by ascending (prefer flatter routes)
    routes.sort((a, b) => a.ascend - b.ascend);

    // If no routes generated, use fallback
    if (routes.length === 0) {
        return generateFallbackRoutes(center, distanceKm, count);
    }

    return routes;
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
 */
function generateFallbackRoutes(
    center: LatLng,
    distanceKm: number,
    count: number
): RouteOption[] {
    const routes: RouteOption[] = [];

    for (let i = 0; i < count; i++) {
        const variation = 0.9 + i * 0.1; // 0.9, 1.0, 1.1
        const adjustedDistance = distanceKm * variation;

        const earthRadiusKm = 6371;
        const radiusKm = adjustedDistance / (2 * Math.PI);
        const latRadiusDeg = (radiusKm / earthRadiusKm) * (180 / Math.PI);
        const lngRadiusDeg =
            (radiusKm / earthRadiusKm) *
            (180 / Math.PI) /
            Math.cos((center.lat * Math.PI) / 180);

        const points: GeneratedRoutePoint[] = [];
        const segments = 40;
        const angleOffset = (i * Math.PI) / 4; // Rotate each route

        for (let j = 0; j <= segments; j++) {
            const t = j / segments;
            const angle = t * Math.PI * 2 + angleOffset;

            const wobble =
                0.85 +
                0.3 * Math.sin(3 * angle + center.lat + i) +
                0.15 * Math.cos(5 * angle + center.lng);

            const lat = center.lat + Math.sin(angle) * latRadiusDeg * wobble;
            const lng = center.lng + Math.cos(angle) * lngRadiusDeg * wobble;

            points.push({ lat, lng, elevation: null });
        }

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
