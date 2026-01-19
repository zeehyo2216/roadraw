'use client';

import { useEffect, useRef, useState } from "react";
import type { LatLng } from "@/lib/loopRoute";
import type { RouteOption } from "@/lib/graphhopperRoute";

type MapCanvasProps = {
  center: LatLng | null;
  routes?: RouteOption[];
  guideRoute?: RouteOption | null; // NEW: The planned route to follow
  selectedRouteIndex?: number;
};

declare global {
  interface Window {
    naver?: typeof naver;
  }
  // eslint-disable-next-line no-var
  var naver: any;
}

const SELECTED_COLOR = "#34d399"; // emerald-400
const GUIDE_COLOR = "#34d399"; // emerald-400 (for guide route)
const UNSELECTED_COLOR = "#6b7280"; // gray-500

export function MapCanvas({ center, routes, guideRoute, selectedRouteIndex = 0 }: MapCanvasProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<any>(null);
  const polylinesRef = useRef<any[]>([]);
  const markerRef = useRef<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!center || !mapRef.current) return;

    const clientId = process.env.NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID;

    if (!clientId) {
      setLoadError("Naver Maps Client ID가 없습니다. .env 확인");
      return;
    }

    const initMap = () => {
      if (!mapRef.current) return;

      const n = window.naver;
      if (!n?.maps) {
        setLoadError("Naver Maps 라이브러리를 불러오지 못했습니다. Client ID/도메인을 확인하세요.");
        return;
      }

      setLoadError(null);

      const centerLatLng = new n.maps.LatLng(center.lat, center.lng);

      if (!mapInstance.current) {
        mapInstance.current = new n.maps.Map(mapRef.current, {
          center: centerLatLng,
          zoom: 15,
          draggable: true,
          pinchZoom: true,
          scrollWheel: true,
          zoomControl: false,
          mapDataControl: false,
          scaleControl: false,
          logoControl: true,
          logoControlOptions: {
            position: n.maps.Position.BOTTOM_LEFT,
          },
        });
      } else {
        mapInstance.current.setCenter(centerLatLng);
      }

      // 현재 위치 마커 생성/업데이트
      if (center) {
        if (!markerRef.current) {
          markerRef.current = new n.maps.Marker({
            position: centerLatLng,
            map: mapInstance.current,
            icon: {
              content: `<div style="
                width: 24px;
                height: 24px;
                background-color: #34d399;
                border: 3px solid #ffffff;
                border-radius: 50%;
                box-shadow: 0 2px 8px rgba(0,0,0,0.4);
              "></div>`,
              anchor: new n.maps.Point(12, 12),
            },
            zIndex: 1000,
          });
        } else {
          markerRef.current.setPosition(centerLatLng);
        }
        mapInstance.current.setCenter(centerLatLng);
      }

      // 기존 폴리라인 제거
      polylinesRef.current.forEach((polyline) => {
        polyline.setMap(null);
      });
      polylinesRef.current = [];

      // 가이드 경로 그리기 (네비게이션 모드)
      if (guideRoute && guideRoute.points.length > 1) {
        const pathLatLngs = guideRoute.points.map(
          (p) => new n.maps.LatLng(p.lat, p.lng)
        );

        // 1. 전체 경로 (반투명 가이드)
        const guidePolyline = new n.maps.Polyline({
          path: pathLatLngs,
          strokeColor: GUIDE_COLOR,
          strokeOpacity: 0.4,
          strokeWeight: 6,
          map: mapInstance.current,
          zIndex: 50,
        });
        polylinesRef.current.push(guidePolyline);

        // 2. 경로 방향 표시 (화살표 등) - 단순화를 위해 점선 등으로 표현 가능하나 일단 실선 유지

        // 가이드 경로에 맞춰 지도 영역 조정 (초기 1회만 하거나 계속 하거나... 일단 매번)
        const bounds = new n.maps.LatLngBounds();
        pathLatLngs.forEach((latlng: any) => bounds.extend(latlng));
        mapInstance.current.fitBounds(bounds, { padding: 60 });
      }

      // 다중 경로 그리기 (선택되지 않은 것 먼저, 선택된 것 나중에)
      if (routes && routes.length > 0) {
        // 선택되지 않은 경로 먼저 그리기 (회색, 아래 레이어)
        routes.forEach((route, index) => {
          if (index === selectedRouteIndex) return;
          if (route.points.length < 2) return;

          const pathLatLngs = route.points.map(
            (p) => new n.maps.LatLng(p.lat, p.lng)
          );

          const polyline = new n.maps.Polyline({
            path: pathLatLngs,
            strokeColor: UNSELECTED_COLOR,
            strokeOpacity: 0.5,
            strokeWeight: 3,
            map: mapInstance.current,
            zIndex: 10,
          });

          polylinesRef.current.push(polyline);
        });

        // 선택된 경로 그리기 (에메랄드, 위 레이어)
        // routes가 있고 guideRoute가 없을 때만 selectedRoute를 강조해서 그립니다.
        // guideRoute가 있으면 routes는 보통 유저가 달려온 경로(빨간색 등)로 표현될 것이므로 로직 분리 필요.
        // 현재 RunTracker에서는 routes에 [userPath]를 넣어서 보내고 있음.

        const selectedRoute = routes[selectedRouteIndex];
        if (selectedRoute && selectedRoute.points.length > 1) {
          const pathLatLngs = selectedRoute.points.map(
            (p) => new n.maps.LatLng(p.lat, p.lng)
          );

          // 가이드 모드일 경우 유저 경로는 다른 색상(예: 주황/빨강/흰색)으로 표시하면 좋음
          // 일단 기존 로직 유지하되, guideRoute가 잇으면 유저 경로는 "실시간 경로" 느낌으로
          const isUserPath = selectedRoute.id === 'run-path';
          const color = isUserPath ? '#ef4444' : SELECTED_COLOR; // Red-500 for user path if tracking

          const polyline = new n.maps.Polyline({
            path: pathLatLngs,
            strokeColor: color,
            strokeOpacity: 0.9,
            strokeWeight: isUserPath ? 4 : 5,
            map: mapInstance.current,
            zIndex: 100,
          });

          polylinesRef.current.push(polyline);

          // 가이드가 없을 때만 선택된 경로에 핏
          if (!guideRoute) {
            const bounds = new n.maps.LatLngBounds();
            pathLatLngs.forEach((latlng: any) => bounds.extend(latlng));
            mapInstance.current.fitBounds(bounds, { padding: 60 });
          }
        }
      }
    };

    if (window.naver?.maps) {
      initMap();
      return;
    }

    const scriptId = "naver-maps-roadraw";
    const existingScript = document.getElementById(scriptId) as
      | HTMLScriptElement
      | null;

    if (!existingScript) {
      setIsLoading(true);
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        script.setAttribute("data-loaded", "true");
        setIsLoading(false);
        initMap();
      };
      script.onerror = () => {
        setIsLoading(false);
        setLoadError("Naver Maps를 불러오는 중 오류가 발생했습니다. Client ID와 도메인 허용을 확인하세요.");
      };
      document.head.appendChild(script);
    } else if (existingScript.getAttribute("data-loaded") === "true") {
      initMap();
    } else {
      setIsLoading(true);
      existingScript.addEventListener("load", () => {
        setIsLoading(false);
        initMap();
      });
      existingScript.addEventListener("error", () => {
        setIsLoading(false);
        setLoadError("Naver Maps를 불러오는 중 오류가 발생했습니다. Client ID와 도메인 허용을 확인하세요.");
      });
    }
  }, [center, routes, guideRoute, selectedRouteIndex]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 'calc(100vh - 4rem)', touchAction: 'none' }} className="rounded-2xl border border-white/5 bg-slate-900/80">
      <div ref={mapRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: '1rem', zIndex: 1, touchAction: 'manipulation' }} />
      {(loadError || isLoading) && (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/70 text-[11px] text-white/70">
          {isLoading ? "지도 로딩 중..." : loadError}
        </div>
      )}
    </div>
  );
}
