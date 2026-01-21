'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
    pathData: { lat: number; lng: number }[];
};

export function RunDetailMap({ pathData }: Props) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        if (!mapRef.current || pathData.length === 0) return;

        const clientId = process.env.NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID;
        if (!clientId) {
            setLoadError("Naver Maps Client ID가 없습니다.");
            return;
        }

        const initMap = () => {
            const n = window.naver;
            if (!n?.maps) {
                setLoadError("Naver Maps 로딩 실패");
                return;
            }

            // Calculate center
            const latSum = pathData.reduce((sum, p) => sum + p.lat, 0);
            const lngSum = pathData.reduce((sum, p) => sum + p.lng, 0);
            const center = new n.maps.LatLng(
                latSum / pathData.length,
                lngSum / pathData.length
            );

            if (!mapInstance.current) {
                mapInstance.current = new n.maps.Map(mapRef.current, {
                    center,
                    zoom: 15,
                    zoomControl: false,
                    mapDataControl: false,
                });
            }

            // Draw path
            const pathLatLngs = pathData.map((p) => new n.maps.LatLng(p.lat, p.lng));

            new n.maps.Polyline({
                path: pathLatLngs,
                strokeColor: '#f97316', // Orange
                strokeOpacity: 1,
                strokeWeight: 4,
                map: mapInstance.current,
            });

            // Fit bounds
            const bounds = new n.maps.LatLngBounds();
            pathLatLngs.forEach((latlng: unknown) => bounds.extend(latlng));
            mapInstance.current.fitBounds(bounds, { padding: 40 });
        };

        if (window.naver?.maps) {
            initMap();
        } else {
            const script = document.createElement('script');
            script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`;
            script.async = true;
            script.onload = initMap;
            document.head.appendChild(script);
        }
    }, [pathData]);

    if (loadError) {
        return (
            <div className="flex h-full items-center justify-center bg-slate-900 text-white/60">
                {loadError}
            </div>
        );
    }

    return <div ref={mapRef} className="h-full w-full" />;
}

declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        naver?: any;
    }
}
