'use client';

import { useState } from "react";
import { LoopPlanner } from "@/components/LoopPlanner";
import { MapCanvas } from "@/components/MapCanvas";
import type { LatLng } from "@/lib/loopRoute";
import type { RouteOption } from "@/lib/graphhopperRoute";

export default function Home() {
  const [mapCenter, setMapCenter] = useState<LatLng | null>(null);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full">
      {/* 배경: 전체 화면에 깔리는 지도 영역 */}
      <div className="absolute inset-0 overflow-hidden">
        <MapCanvas
          center={mapCenter}
          routes={routes}
          selectedRouteIndex={selectedRouteIndex}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black via-transparent to-transparent" style={{ height: '120px' }} />
      </div>

      {/* 플로팅 플래너 카드 */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-4 pb-6 sm:px-6 sm:pb-8">
        <section className="pointer-events-auto mx-auto w-full max-w-xl">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/85 shadow-[0_24px_80px_rgba(15,23,42,0.95)] backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-xs text-white/60">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.8)]" />
                <span className="font-medium text-[11px] uppercase tracking-[0.18em] text-emerald-100">
                  Loop Planner
                </span>
              </div>
              <span>루프 코스 생성</span>
            </div>

            <LoopPlanner
              onCenterChange={setMapCenter}
              onRoutesChange={setRoutes}
              onSelectedRouteChange={setSelectedRouteIndex}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
