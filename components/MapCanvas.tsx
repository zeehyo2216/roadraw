'use client';

import { useEffect, useRef, useState } from "react";
import type { LatLng } from "@/lib/loopRoute";
import type { RouteOption } from "@/lib/graphhopperRoute";

type MapCanvasProps = {
  center: LatLng | null;
  routes?: RouteOption[];
  guideRoute?: RouteOption | null;
  selectedRouteIndex?: number;
  heading?: number | null;
  followUser?: boolean;
  onMapInteraction?: () => void;
  progressIndex?: number; // NEW: Index of the current point on the guide route
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

export function MapCanvas({ center, routes, guideRoute, selectedRouteIndex = 0, heading, followUser = false, onMapInteraction, progressIndex = 0 }: MapCanvasProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<any>(null);
  const polylinesRef = useRef<any[]>([]);
  const markerRef = useRef<any>(null);
  const initialFitDone = useRef(false);
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
          zoom: 17, // Closer zoom for navigation
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
      }

      // Update center if followUser is true
      if (followUser) {
        mapInstance.current.setCenter(centerLatLng);

        // Rotate map so heading direction is up (heading-up navigation)
        if (heading !== null && heading !== undefined) {
          mapInstance.current.setOptions({
            heading: heading, // Map rotates to show heading direction as up
          });
        }
      }

      // Listen for user map interactions (drag)
      if (onMapInteraction && !mapInstance.current._dragListener) {
        mapInstance.current._dragListener = window.naver.maps.Event.addListener(
          mapInstance.current,
          'dragend',
          () => onMapInteraction()
        );
      }

      // Create/update user location marker with heading indicator
      const headingDeg = heading ?? 0;
      const markerContent = `
        <div style="position: relative; width: 40px; height: 40px;">
          <!-- Heading arrow -->
          <div style="
            position: absolute;
            top: -8px;
            left: 50%;
            transform: translateX(-50%) rotate(${headingDeg}deg);
            transform-origin: center 28px;
            width: 0;
            height: 0;
            border-left: 8px solid transparent;
            border-right: 8px solid transparent;
            border-bottom: 16px solid #34d399;
            filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
          "></div>
          <!-- Center dot -->
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 20px;
            height: 20px;
            background-color: #34d399;
            border: 3px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          "></div>
        </div>
      `;

      if (!markerRef.current) {
        markerRef.current = new n.maps.Marker({
          position: centerLatLng,
          map: mapInstance.current,
          icon: {
            content: markerContent,
            anchor: new n.maps.Point(20, 20),
          },
          zIndex: 1000,
        });
      } else {
        markerRef.current.setPosition(centerLatLng);
        markerRef.current.setIcon({
          content: markerContent,
          anchor: new n.maps.Point(20, 20),
        });
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

        // 1. 전체 경로 (에메랄드 가이드 라인 - 베이스)
        const guidePolyline = new n.maps.Polyline({
          path: pathLatLngs,
          strokeColor: GUIDE_COLOR,
          strokeOpacity: 0.7,
          strokeWeight: 5,
          map: mapInstance.current,
          zIndex: 50,
        });
        polylinesRef.current.push(guidePolyline);

        // 2. 지나온 구간 (주황색 - 덮어씌우기)
        if (progressIndex > 0) {
          const passedLatLngs = pathLatLngs.slice(0, progressIndex + 1);
          const passedPolyline = new n.maps.Polyline({
            path: passedLatLngs,
            strokeColor: '#f97316', // Orange-500
            strokeOpacity: 1,
            strokeWeight: 5,
            map: mapInstance.current,
            zIndex: 60, // Base(50) 위에 그림
          });
          polylinesRef.current.push(passedPolyline);
        }

        // 초기 1회만 경로에 맞춰 지도 영역 조정
        if (!initialFitDone.current && !followUser) {
          const bounds = new n.maps.LatLngBounds();
          pathLatLngs.forEach((latlng: any) => bounds.extend(latlng));
          mapInstance.current.fitBounds(bounds, { padding: 60 });
          initialFitDone.current = true;
        }
      }

      // 다중 경로 그리기 (선택되지 않은 것 먼저, 선택된 것 나중에)
      // 네비게이션 모드(guideRoute 있음)일 때는 유저 경로(run-path)를 따로 그리지 않음 (위의 흰색 라인으로 대체)
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
        // guideRoute가 없을 때만 그리기 OR run-path가 아닌 경우만 그리기
        const selectedRoute = routes[selectedRouteIndex];
        if (selectedRoute && selectedRoute.points.length > 1) {
          // 가이드 모드이고 현재 경로가 유저 경로라면 스킵 (이미 위에서 흰색으로 처리됨)
          if (guideRoute && selectedRoute.id === 'run-path') {
            return;
          }

          const pathLatLngs = selectedRoute.points.map(
            (p) => new n.maps.LatLng(p.lat, p.lng)
          );

          const polyline = new n.maps.Polyline({
            path: pathLatLngs,
            strokeColor: SELECTED_COLOR,
            strokeOpacity: 0.9,
            strokeWeight: 5,
            map: mapInstance.current,
            zIndex: 100,
          });

          polylinesRef.current.push(polyline);

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
  }, [center, routes, guideRoute, selectedRouteIndex, heading, followUser, progressIndex]);

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
