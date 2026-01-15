'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import { MapCanvas } from "@/components/MapCanvas";
import type { LatLng } from "@/lib/loopRoute";
import type { RouteOption } from "@/lib/graphhopperRoute";

type RunStats = {
  elapsedSec: number;
  distanceKm: number;
  cadence: number;
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
  const [stats, setStats] = useState<RunStats>({
    elapsedSec: 0,
    distanceKm: 0,
    cadence: 164,
  });
  const [isRunning, setIsRunning] = useState(true);
  const startTimeRef = useRef<number | null>(null);
  const watchIdRef = useRef<number | null>(null);

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

        return {
          ...prev,
          elapsedSec,
          cadence,
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
            <span>러닝 중 · 장치를 너무 자주 잠그지 마세요</span>
          </div>

          <div className="grid grid-cols-4 gap-3 text-center text-[11px] sm:gap-4">
            <div className="col-span-2 rounded-2xl bg-white/5 px-3 py-3 sm:px-4 sm:py-4">
              <div className="text-[10px] uppercase tracking-[0.16em] text-white/45">
                Pace
              </div>
              <div className="mt-1 text-2xl font-semibold sm:text-3xl">
                {paceDisplay}
              </div>
            </div>
            <div className="rounded-2xl bg-white/5 px-3 py-3 sm:px-4 sm:py-4">
              <div className="text-[10px] uppercase tracking-[0.16em] text-white/45">
                Distance
              </div>
              <div className="mt-1 text-lg font-semibold sm:text-xl">
                {distanceDisplay}
              </div>
              <div className="mt-0.5 text-[10px] text-white/50">km</div>
            </div>
            <div className="rounded-2xl bg-white/5 px-3 py-3 sm:px-4 sm:py-4">
              <div className="text-[10px] uppercase tracking-[0.16em] text-white/45">
                Time
              </div>
              <div className="mt-1 text-lg font-semibold sm:text-xl">
                {timeDisplay}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center text-[11px] text-white/70 sm:gap-4">
            <div className="rounded-2xl border border-white/10 bg-black/60 px-3 py-2.5">
              <div className="text-[10px] text-white/45">Cadence</div>
              <div className="mt-1 text-lg font-semibold">
                {stats.cadence}
              </div>
              <div className="mt-0.5 text-[10px] text-white/45">spm</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/60 px-3 py-2.5">
              <div className="text-[10px] text-white/45">Elevation</div>
              <div className="mt-1 text-lg font-semibold">—</div>
              <div className="mt-0.5 text-[10px] text-emerald-300">
                GraphHopper 고도 연동 예정
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/60 px-3 py-2.5">
              <div className="text-[10px] text-white/45">Signals</div>
              <div className="mt-1 text-lg font-semibold">—</div>
              <div className="mt-0.5 text-[10px] text-white/45">
                신호등 데이터 연동 예정
              </div>
            </div>
          </div>

          <div className="mt-1 flex items-center justify-between gap-3 text-[11px]">
            <button
              type="button"
              onClick={() => setIsRunning((prev) => !prev)}
              className="flex flex-1 items-center justify-center rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold text-black shadow-[0_12px_32px_rgba(16,185,129,0.7)] hover:bg-emerald-300"
            >
              {isRunning ? "일시 정지" : "다시 시작"}
            </button>
            <button
              type="button"
              className="flex flex-1 items-center justify-center rounded-full border border-red-400/60 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/20"
            >
              러닝 종료 및 저장 (MVP)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

