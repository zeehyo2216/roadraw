'use client';

import { useEffect, useState, useTransition } from "react";
import { generateLoopRouteAction } from "@/app/actions/routes";
import type { LatLng } from "@/lib/loopRoute";
import type { RouteOption } from "@/lib/graphhopperRoute";

const MIN_KM = 1;
const MAX_KM = 10;

type LoopPlannerProps = {
  onCenterChange?: (center: LatLng | null) => void;
  onRoutesChange?: (routes: RouteOption[]) => void;
  onSelectedRouteChange?: (index: number) => void;
};

export function LoopPlanner({
  onCenterChange,
  onRoutesChange,
  onSelectedRouteChange
}: LoopPlannerProps) {
  const [distanceKm, setDistanceKm] = useState(3);
  const [isGenerating, startTransition] = useTransition();
  const [center, setCenter] = useState<LatLng | null>(null);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isRequestingLocation, setIsRequestingLocation] = useState(true);

  // 페이지 접속 시 자동으로 위치 권한 요청
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setLocationError("이 브라우저에서는 위치 서비스를 사용할 수 없어요.");
      setIsRequestingLocation(false);
      return;
    }

    setIsRequestingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextCenter = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setCenter(nextCenter);
        onCenterChange?.(nextCenter);
        setIsRequestingLocation(false);
      },
      (err) => {
        setIsRequestingLocation(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError("위치 권한이 차단되어 있어요. 브라우저 설정에서 다시 허용해주세요.");
        } else if (err.code === err.TIMEOUT) {
          setLocationError("위치 정보를 가져오는 데 시간이 오래 걸렸어요. 다시 시도해주세요.");
        } else {
          setLocationError("위치 정보를 가져올 수 없어요.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [onCenterChange]);

  const handleUseLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocationError("이 브라우저에서는 위치 서비스를 사용할 수 없어요.");
      return;
    }

    setIsRequestingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextCenter = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setCenter(nextCenter);
        onCenterChange?.(nextCenter);
        setIsRequestingLocation(false);
      },
      (err) => {
        setIsRequestingLocation(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError("위치 권한이 차단되어 있어요. 브라우저 설정에서 다시 허용해주세요.");
        } else if (err.code === err.TIMEOUT) {
          setLocationError("위치 정보를 가져오는 데 시간이 오래 걸렸어요. 다시 시도해주세요.");
        } else {
          setLocationError("위치 정보를 가져올 수 없어요.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleGenerate = () => {
    if (!center) return;
    startTransition(async () => {
      const result = await generateLoopRouteAction({
        center,
        distanceKm,
      });
      setRoutes(result.routes);
      setSelectedRouteIndex(0);
      onRoutesChange?.(result.routes);
      onSelectedRouteChange?.(0);
    });
  };

  const handleRouteSelect = (index: number) => {
    setSelectedRouteIndex(index);
    onSelectedRouteChange?.(index);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.round(seconds / 60);
    return `${mins}분`;
  };

  const formatDistance = (km: number) => {
    return `${km.toFixed(1)}km`;
  };

  return (
    <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
      {/* Controls */}
      <div className="rounded-2xl border border-white/10 bg-black/40 p-3 text-xs text-white/70">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-white/80">
            목표 거리
          </span>
          <span className="text-[11px] font-semibold text-emerald-200">
            {distanceKm.toFixed(1)} km
          </span>
        </div>
        <input
          type="range"
          min={MIN_KM}
          max={MAX_KM}
          step={0.5}
          value={distanceKm}
          onChange={(e) => setDistanceKm(Number(e.target.value))}
          className="mt-3 h-1 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-emerald-400"
        />
        <div className="mt-2 flex justify-between text-[10px] text-white/45">
          <span>{MIN_KM} km · 가벼운 산책</span>
          <span>{MAX_KM} km · 롱런</span>
        </div>
      </div>

      {/* Generate Button */}
      <div className="flex flex-wrap items-center gap-2">
        {!center && !isRequestingLocation && (
          <button
            type="button"
            onClick={handleUseLocation}
            className="inline-flex flex-1 items-center justify-center rounded-full border border-emerald-300/70 bg-black/60 px-4 py-2 text-[11px] font-medium text-emerald-100 hover:bg-black"
          >
            위치 다시 요청하기
          </button>
        )}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!center || isGenerating || isRequestingLocation}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-emerald-400 px-4 py-2.5 text-xs font-semibold text-black shadow-[0_12px_32px_rgba(16,185,129,0.65)] transition hover:bg-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRequestingLocation
            ? "위치 정보 대기 중..."
            : center
              ? isGenerating
                ? "코스 생성 중..."
                : "루프 코스 생성하기"
              : "위치 허용 후 코스 생성"}
        </button>
      </div>

      {/* Route Cards */}
      {routes.length > 0 && (
        <div className="mt-2">
          <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-white/50">
            추천 코스 ({routes.length}개)
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {routes.map((route, index) => (
              <button
                key={route.id}
                type="button"
                onClick={() => handleRouteSelect(index)}
                className={`flex-shrink-0 rounded-xl border px-3 py-2.5 text-left transition-all ${index === selectedRouteIndex
                    ? "border-emerald-400/60 bg-emerald-400/10 text-white"
                    : "border-white/10 bg-black/40 text-white/70 hover:border-white/20"
                  }`}
                style={{ minWidth: "100px" }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${index === selectedRouteIndex
                        ? "bg-emerald-400 text-black"
                        : "bg-white/20 text-white/80"
                      }`}
                  >
                    {index + 1}
                  </span>
                  <span className="text-[11px] font-medium truncate">
                    {route.name}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold">
                    {formatDistance(route.estimatedDistanceKm)}
                  </span>
                  <span className="text-[10px] text-white/50">
                    {formatTime(route.totalTime)}
                  </span>
                </div>
                {route.ascend > 0 && (
                  <div className="mt-1 text-[9px] text-white/40">
                    ↑ {Math.round(route.ascend)}m
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Location Error */}
      {locationError && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-[11px] text-red-200">
          {locationError}
        </div>
      )}
    </div>
  );
}
