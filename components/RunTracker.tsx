'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import { MapCanvas } from "@/components/MapCanvas";
import type { LatLng } from "@/lib/loopRoute";
import type { RouteOption } from "@/lib/graphhopperRoute";

type RunStats = {
  elapsedSec: number;
  distanceKm: number;
  cadence: number;
  calories: number; // NEW
};

function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h =
    sinDLat * sinDLat +
    sinDLng * sinDLng * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

export function RunTracker() {
  const [path, setPath] = useState<LatLng[]>([]);
  const [center, setCenter] = useState<LatLng | null>(null);
  const [guideRoute, setGuideRoute] = useState<RouteOption | null>(null); // NEW
  const [stats, setStats] = useState<RunStats>({
    elapsedSec: 0,
    distanceKm: 0,
    cadence: 164,
    calories: 0, // NEW
  });
  const [isRunning, setIsRunning] = useState(true);
  const startTimeRef = useRef<number | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Load guide route from localStorage if available
  useEffect(() => {
    const savedRoute = localStorage.getItem('activeRoute');
    if (savedRoute) {
      try {
        const parsed = JSON.parse(savedRoute);
        setGuideRoute(parsed);
      } catch (e) {
        console.error("Failed to parse activeRoute", e);
      }
    }
  }, []);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      return;
    }

    startTimeRef.current = Date.now();

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const nextPoint: LatLng = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };

        setCenter((prevCenter) => prevCenter ?? nextPoint);

        setPath((prev) => {
          if (prev.length === 0) return [nextPoint];
          const last = prev[prev.length - 1];
          const deltaKm = haversineKm(last, nextPoint);

          if (deltaKm < 0.005) {
            return prev;
          }

          setStats((prevStats) => ({
            ...prevStats,
            distanceKm: prevStats.distanceKm + deltaKm,
          }));

          return [...prev, nextPoint];
        });
      },
      () => {
        // Ignore geolocation errors for now.
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 2000,
      }
    );

    const interval = setInterval(() => {
      if (!isRunning || !startTimeRef.current) return;
      const now = Date.now();
      const elapsedSec = Math.floor((now - startTimeRef.current) / 1000);

      setStats((prev) => {
        const distance = prev.distanceKm;
        const baseCadence = 162;
        const paceFactor = distance > 0 ? Math.min(1.4, 6 / (distance + 1)) : 1;
        const cadence = Math.round(baseCadence * paceFactor);

        // Calorie estimate: approx 70kcal per km (standard avg for ~70kg runner)
        // More precise: METs * Weight(kg) * Time(h). Running 10km/h is ~10 METs.
        // Simple approximation: 1 kcal/kg/km.
        // Let's use 70 * distanceKm for total calories burned so far.
        const calories = Math.floor(distance * 70);

        return {
          ...prev,
          elapsedSec,
          cadence,
          calories,
        };
      });
    }, 1000);

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      clearInterval(interval);
    };
  }, [isRunning]);

  const paceDisplay = useMemo(() => {
    if (stats.distanceKm <= 0.05) return "—";
    const paceSecPerKm = stats.elapsedSec / stats.distanceKm;
    const min = Math.floor(paceSecPerKm / 60);
    const sec = Math.floor(paceSecPerKm % 60)
      .toString()
      .padStart(2, "0");
    return `${min}:${sec} /km`;
  }, [stats.distanceKm, stats.elapsedSec]);

  const distanceDisplay = stats.distanceKm.toFixed(2);

  const timeDisplay = useMemo(() => {
    const h = Math.floor(stats.elapsedSec / 3600);
    const m = Math.floor((stats.elapsedSec % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = Math.floor(stats.elapsedSec % 60)
      .toString()
      .padStart(2, "0");
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  }, [stats.elapsedSec]);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-black text-white">
      <div className="relative flex-1">
        <div className="absolute inset-0">
          {center ? (
            <MapCanvas
              center={center}
              guideRoute={guideRoute} // Pass the guide route
              routes={path.length > 1 ? [{
                id: 'run-path',
                name: '러닝 경로',
                points: path.map(p => ({ ...p, elevation: null })),
                estimatedDistanceKm: stats.distanceKm,
                totalTime: stats.elapsedSec,
                ascend: 0,
                descend: 0,
              }] : []}
              selectedRouteIndex={0}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-b from-slate-900 via-slate-950 to-black text-xs text-white/60">
              브라우저에서 위치 접근을 허용하면,
              <br />
              이 화면에서 실제 루트가 그려집니다.
            </div>
          )}
        </div>

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      </div>

      <div className="relative border-t border-white/10 bg-black/90 px-4 pb-6 pt-4 text-xs sm:px-6 sm:pb-8 sm:pt-5">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          <div className="flex items-center justify-between text-[11px] text-white/55">
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-emerald-200">
              Live Run
            </span>
            <span>{guideRoute ? `목표: ${guideRoute.name}` : "자유 러닝"}</span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center text-[11px] sm:gap-4">
            {/* 1. Pace */}
            <div className="rounded-2xl bg-white/5 px-2 py-3 sm:px-4 sm:py-4">
              <div className="text-[10px] uppercase tracking-[0.16em] text-white/45">
                Pace
              </div>
              <div className="mt-1 text-xl font-semibold sm:text-2xl">
                {paceDisplay}
              </div>
            </div>

            {/* 2. Time */}
            <div className="rounded-2xl bg-white/5 px-2 py-3 sm:px-4 sm:py-4">
              <div className="text-[10px] uppercase tracking-[0.16em] text-white/45">
                Time
              </div>
              <div className="mt-1 text-xl font-semibold sm:text-2xl">
                {timeDisplay}
              </div>
            </div>

            {/* 3. Calories (New) */}
            <div className="rounded-2xl bg-white/5 px-2 py-3 sm:px-4 sm:py-4">
              <div className="text-[10px] uppercase tracking-[0.16em] text-white/45">
                Kcal
              </div>
              <div className="mt-1 text-xl font-semibold sm:text-2xl">
                {stats.calories}
              </div>
            </div>

            {/* 4. Distance */}
            <div className="rounded-2xl bg-white/5 px-2 py-3 sm:px-4 sm:py-4">
              <div className="text-[10px] uppercase tracking-[0.16em] text-white/45">
                Dist
              </div>
              <div className="mt-1 text-xl font-semibold sm:text-2xl">
                {distanceDisplay}
              </div>
              <div className="mt-0.5 text-[9px] text-white/50">km</div>
            </div>
          </div>

          <div className="mt-1 flex items-center justify-between gap-3 text-[11px]">
            <button
              type="button"
              onClick={() => setIsRunning((prev) => !prev)}
              className="flex flex-1 items-center justify-center rounded-full bg-emerald-400 px-4 py-3 text-xs font-bold text-black shadow-[0_12px_32px_rgba(16,185,129,0.7)] hover:bg-emerald-300 active:scale-95 transition-all"
            >
              {isRunning ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="mr-1"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
                  일시 정지
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="mr-1"><path d="M8 5v14l11-7z" /></svg>
                  다시 시작
                </>
              )}
            </button>
            <button
              type="button"
              className="flex flex-1 items-center justify-center rounded-full border border-red-400/60 bg-red-500/10 px-4 py-3 text-xs font-semibold text-red-200 hover:bg-red-500/20 active:scale-95 transition-all"
            >
              종료
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

