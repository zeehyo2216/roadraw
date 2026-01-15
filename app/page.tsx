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
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-32 bg-gradient-to-b from-black to-transparent" />
      </div>

      {/* 플로팅 플래너 카드 */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-4 pb-6 sm:px-6 sm:pb-8">
        <section className="pointer-events-auto mx-auto w-full max-w-xl">
          <LoopPlanner
            onCenterChange={setMapCenter}
            onRoutesChange={setRoutes}
            onSelectedRouteChange={setSelectedRouteIndex}
          />
        </section>
      </div>
    </div>
  );
}
