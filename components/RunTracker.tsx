'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { MapCanvas } from "@/components/MapCanvas";
import { saveRun } from "@/app/actions/runs";
import type { LatLng } from "@/lib/loopRoute";
import type { RouteOption } from "@/lib/graphhopperRoute";

type RunStats = {
  elapsedSec: number;
  distanceKm: number;
  calories: number;
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

// Calculate bearing between two points
function calculateBearing(from: LatLng, to: LatLng): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const toDeg = (v: number) => (v * 180) / Math.PI;

  const dLng = toRad(to.lng - from.lng);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);

  const x = Math.sin(dLng) * Math.cos(lat2);
  const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  let bearing = toDeg(Math.atan2(x, y));
  return (bearing + 360) % 360;
}

// Get turn instruction based on angle difference
function getTurnInstruction(currentBearing: number, nextBearing: number): { text: string; icon: string } {
  let diff = nextBearing - currentBearing;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;

  if (Math.abs(diff) < 20) {
    return { text: "직진", icon: "↑" };
  } else if (diff >= 20 && diff < 70) {
    return { text: "우측으로 이동", icon: "↗" };
  } else if (diff >= 70 && diff < 110) {
    return { text: "우회전", icon: "→" };
  } else if (diff >= 110) {
    return { text: "크게 우회전", icon: "↘" };
  } else if (diff <= -20 && diff > -70) {
    return { text: "좌측으로 이동", icon: "↖" };
  } else if (diff <= -70 && diff > -110) {
    return { text: "좌회전", icon: "←" };
  } else {
    return { text: "크게 좌회전", icon: "↙" };
  }
}

export function RunTracker() {
  const router = useRouter();
  const [path, setPath] = useState<LatLng[]>([]);
  const [center, setCenter] = useState<LatLng | null>(null);
  const [heading, setHeading] = useState<number>(0);
  const [guideRoute, setGuideRoute] = useState<RouteOption | null>(null);
  const [stats, setStats] = useState<RunStats>({
    elapsedSec: 0,
    distanceKm: 0,
    calories: 0,
  });
  const [isRunning, setIsRunning] = useState(true);
  const [nextInstruction, setNextInstruction] = useState<{ text: string; icon: string; distance: number }>({
    text: "경로를 따라 이동하세요",
    icon: "↑",
    distance: 0,
  });
  const [shouldRecenter, setShouldRecenter] = useState(true); // Start with true to center on initial load
  const [showStopConfirm, setShowStopConfirm] = useState(false); // Stop confirmation modal
  const [showSaveModal, setShowSaveModal] = useState(false); // Save record modal for non-logged-in users
  const [isSaving, setIsSaving] = useState(false);
  const { data: session, status } = useSession();
  const startTimeRef = useRef<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const hasInitialCentered = useRef(false); // Track if we've done initial center

  // Load guide route and saved path from localStorage if available
  useEffect(() => {
    // Check for rerun route from history detail page first
    const rerunRoute = sessionStorage.getItem('rerunRoute');
    if (rerunRoute) {
      try {
        const parsed = JSON.parse(rerunRoute);
        // Convert to RouteOption format
        const routeOption: RouteOption = {
          id: 'rerun',
          name: parsed.name || '저장된 경로',
          points: parsed.points.map((p: { lat: number; lng: number }) => ({
            lat: p.lat,
            lng: p.lng,
          })),
          estimatedDistanceKm: parsed.estimatedDistanceKm,
          totalTime: parsed.estimatedDistanceKm * 360, // Assume 6:00/km pace
          ascend: 0,
          descend: 0,
        };
        setGuideRoute(routeOption);
        sessionStorage.removeItem('rerunRoute'); // Clear after loading
      } catch (e) {
        console.error("Failed to parse rerunRoute", e);
      }
    } else {
      // Load from localStorage (normal flow)
      const savedRoute = localStorage.getItem('activeRoute');
      if (savedRoute) {
        try {
          const parsed = JSON.parse(savedRoute);
          setGuideRoute(parsed);
        } catch (e) {
          console.error("Failed to parse activeRoute", e);
        }
      }
    }

    // Restore saved path if exists
    const savedPath = localStorage.getItem('runPath');
    if (savedPath) {
      try {
        const parsedPath = JSON.parse(savedPath);
        setPath(parsedPath);
      } catch (e) {
        console.error("Failed to parse runPath", e);
      }
    }

    // Restore saved stats if exists
    const savedStats = localStorage.getItem('runStats');
    if (savedStats) {
      try {
        const parsedStats = JSON.parse(savedStats);
        setStats(parsedStats);
        // Adjust startTimeRef to account for restored elapsed time
        // This way the timer continues from where it left off
        if (parsedStats.elapsedSec > 0) {
          startTimeRef.current = Date.now() - (parsedStats.elapsedSec * 1000);
        }
      } catch (e) {
        console.error("Failed to parse runStats", e);
      }
    }
  }, []);

  // Save path to localStorage whenever it changes
  useEffect(() => {
    if (path.length > 0) {
      localStorage.setItem('runPath', JSON.stringify(path));
    }
  }, [path]);

  // Save stats to localStorage whenever they change (throttled)
  useEffect(() => {
    if (stats.elapsedSec > 0 || stats.distanceKm > 0) {
      localStorage.setItem('runStats', JSON.stringify(stats));
    }
  }, [stats]);

  // Track progress along the route
  const [progressIndex, setProgressIndex] = useState(0);
  const lastProgressIndexRef = useRef(0);

  // Find next waypoint, calculate instruction, and update progress
  useEffect(() => {
    if (!center || !guideRoute || guideRoute.points.length < 2) return;

    // Search for closest point, prioritizing forward progress
    // Search window: look 50 points back (for drift) and 200 points forward
    // For the start of the run, we search the beginning.
    // As we progress, we avoid snapping back to 0 if the loop ends near 0.

    let minDist = Infinity;
    let closestIdx = lastProgressIndexRef.current;

    const startSearch = Math.max(0, lastProgressIndexRef.current - 50);
    const endSearch = Math.min(guideRoute.points.length - 1, lastProgressIndexRef.current + 200);

    // If we are at the very end, and it's a loop, we might want to stay at the end.
    // Just simple window search is robust enough for standard running speeds.

    for (let i = startSearch; i <= endSearch; i++) {
      const p = guideRoute.points[i];
      const dist = haversineKm(center, p);
      if (dist < minDist) {
        minDist = dist;
        closestIdx = i;
      }
    }

    // Safety fallback: if we got lost (distance too high), search globally? 
    // Maybe later. For now, assume consistent tracking.

    lastProgressIndexRef.current = closestIdx;
    setProgressIndex(closestIdx);

    // Look ahead to find next turn
    const lookAhead = Math.min(closestIdx + 5, guideRoute.points.length - 1);
    if (lookAhead > closestIdx) {
      const currentPoint = guideRoute.points[closestIdx];
      const nextPoint = guideRoute.points[lookAhead];
      const distanceToNext = haversineKm(center, nextPoint) * 1000; // meters

      const bearingToNext = calculateBearing(currentPoint, nextPoint);
      const instruction = getTurnInstruction(heading, bearingToNext);

      setNextInstruction({
        ...instruction,
        distance: Math.round(distanceToNext),
      });
    }
  }, [center, guideRoute, heading]);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      return;
    }

    // Only set startTimeRef if not already restored from localStorage
    if (!startTimeRef.current) {
      startTimeRef.current = Date.now();
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const nextPoint: LatLng = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };

        // Update heading if available
        if (pos.coords.heading !== null && !isNaN(pos.coords.heading)) {
          setHeading(pos.coords.heading);
        }

        setCenter(nextPoint);

        setPath((prev) => {
          if (prev.length === 0) return [nextPoint];
          const last = prev[prev.length - 1];
          const deltaKm = haversineKm(last, nextPoint);

          if (deltaKm < 0.005) {
            return prev;
          }

          // Calculate heading from movement if device heading not available
          if (!pos.coords.heading || isNaN(pos.coords.heading)) {
            const newHeading = calculateBearing(last, nextPoint);
            setHeading(newHeading);
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

      setStats((prev) => ({
        ...prev,
        elapsedSec,
        calories: Math.floor(prev.distanceKm * 70),
      }));
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
    return `${min}'${sec}"`;
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

  // Handle stop button
  const handleStopClick = () => {
    setShowStopConfirm(true);
  };

  const handleConfirmStop = async () => {
    setShowStopConfirm(false);

    // Check if user is logged in
    if (session?.user) {
      // Save run directly
      await handleSaveRun();
    } else {
      // Show save modal for non-logged-in users
      setShowSaveModal(true);
    }
  };

  const handleSaveRun = async () => {
    setIsSaving(true);
    try {
      const result = await saveRun({
        pathData: path,
        totalDistanceKm: stats.distanceKm,
        totalDurationSec: stats.elapsedSec,
        calories: stats.calories,
      });

      if (result.error) {
        console.error(result.error);
        // Clear local data and navigate to history on error
        localStorage.removeItem('activeRoute');
        localStorage.removeItem('runPath');
        localStorage.removeItem('runStats');
        router.push('/history');
        return;
      }

      // Clear local data and navigate to the saved run's detail page
      localStorage.removeItem('activeRoute');
      localStorage.removeItem('runPath');
      localStorage.removeItem('runStats');

      if (result.runId) {
        router.push(`/history/${result.runId}`);
      } else {
        router.push('/history');
      }
    } catch (error) {
      console.error('Failed to save run:', error);
      localStorage.removeItem('activeRoute');
      localStorage.removeItem('runPath');
      localStorage.removeItem('runStats');
      router.push('/history');
    }
  };

  const handleDiscardRun = () => {
    localStorage.removeItem('activeRoute');
    localStorage.removeItem('runPath');
    localStorage.removeItem('runStats');
    router.push('/');
  };

  const handleSignUpToSave = () => {
    // Store run data temporarily before redirecting
    localStorage.setItem('pendingRun', JSON.stringify({
      pathData: path,
      totalDistanceKm: stats.distanceKm,
      totalDurationSec: stats.elapsedSec,
      calories: stats.calories,
    }));
    router.push('/auth/signup?callbackUrl=/run/save-pending');
  };

  return (
    <div
      className="relative flex flex-col bg-black text-white h-[100dvh]"
      style={{
        minHeight: '-webkit-fill-available', // iOS Safari fallback
      }}
    >
      {/* Top gradient overlay and navigation instruction */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-36 bg-gradient-to-b from-black via-black/70 to-transparent" />

      {/* Navigation instruction bar - positioned below header */}
      {guideRoute && (
        <div className="absolute left-4 top-20 z-30 flex items-center gap-3 sm:left-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-500 text-2xl font-bold text-white shadow-lg">
            {nextInstruction.icon}
          </div>
          <div className="flex flex-col rounded-xl bg-black/60 backdrop-blur-md px-4 py-2.5 shadow-lg border border-white/10">
            <span className="text-sm font-medium text-emerald-300">
              {nextInstruction.distance > 0 ? `${nextInstruction.distance}m 후` : "곧"}
            </span>
            <span className="text-lg font-bold text-white">
              {nextInstruction.text}
            </span>
          </div>
        </div>
      )}

      {/* Map area - full screen */}
      <div className="absolute inset-0">
        {center ? (
          <MapCanvas
            center={center}
            guideRoute={guideRoute}
            heading={heading}
            followUser={shouldRecenter}
            progressIndex={progressIndex}
            onMapInteraction={() => setShouldRecenter(false)}
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
            위치 권한을 허용해주세요
          </div>
        )}
      </div>

      {/* Recenter button */}
      {center && !shouldRecenter && (
        <button
          type="button"
          onClick={() => setShouldRecenter(true)}
          className="absolute left-3 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white shadow-lg backdrop-blur-sm transition-all hover:bg-black/90 active:scale-95"
          style={{ bottom: 'calc(150px + env(safe-area-inset-bottom, 0px))' }}
          aria-label="내 위치로 이동"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
          </svg>
        </button>
      )}

      {/* Bottom gradient overlay */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-48 bg-gradient-to-t from-black via-black/80 to-transparent" />

      {/* Stats panel at bottom - using safe area padding for mobile */}
      <div className="absolute inset-x-0 bottom-0 z-20 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 sm:px-6 sm:pb-6">
        <div className="mx-auto max-w-xl">
          {/* Stats grid - more compact */}
          <div className="mb-3 grid grid-cols-4 gap-1.5 text-center">
            <div className="rounded-lg bg-black/70 px-1.5 py-2 backdrop-blur-sm">
              <div className="text-[9px] uppercase tracking-wider text-white/50">페이스</div>
              <div className="mt-0.5 text-lg font-bold">{paceDisplay}</div>
            </div>
            <div className="rounded-lg bg-black/70 px-1.5 py-2 backdrop-blur-sm">
              <div className="text-[9px] uppercase tracking-wider text-white/50">시간</div>
              <div className="mt-0.5 text-lg font-bold">{timeDisplay}</div>
            </div>
            <div className="rounded-lg bg-black/70 px-1.5 py-2 backdrop-blur-sm">
              <div className="text-[9px] uppercase tracking-wider text-white/50">칼로리</div>
              <div className="mt-0.5 text-lg font-bold">{stats.calories}</div>
            </div>
            <div className="rounded-lg bg-black/70 px-1.5 py-2 backdrop-blur-sm">
              <div className="text-[9px] uppercase tracking-wider text-white/50">거리</div>
              <div className="mt-0.5 text-lg font-bold">{distanceDisplay}<span className="text-[9px] text-white/40 ml-0.5">km</span></div>
            </div>
          </div>

          {/* Control buttons - more compact */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsRunning((prev) => !prev)}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-emerald-400 px-5 py-3 text-sm font-bold text-black shadow-[0_6px_20px_rgba(16,185,129,0.4)] transition-all hover:bg-emerald-300 active:scale-95"
            >
              {isRunning ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
                  일시정지
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                  재개
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleStopClick}
              className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-red-400/60 bg-red-500/20 text-red-300 transition-all hover:bg-red-500/30 active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h12v12H6z" /></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Stop Confirmation Modal */}
      {showStopConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-slate-900 p-6 shadow-2xl">
            <h3 className="mb-2 text-lg font-bold text-white">러닝을 종료하시겠습니까?</h3>
            <p className="mb-6 text-sm text-white/60">
              {session?.user ? '기록이 저장됩니다.' : '회원가입하고 기록을 저장할 수 있습니다.'}
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowStopConfirm(false)} className="flex-1 rounded-full bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/20 active:scale-95">취소</button>
              <button type="button" onClick={handleConfirmStop} className="flex-1 rounded-full bg-emerald-400 px-4 py-2.5 text-sm font-bold text-black transition-all hover:bg-emerald-300 active:scale-95">
                {isSaving ? '저장 중...' : '종료하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Record Modal (for non-logged-in users) */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-slate-900 p-6 shadow-2xl">
            <h3 className="mb-2 text-lg font-bold text-white">기록을 저장하시겠습니까?</h3>
            <p className="mb-6 text-sm text-white/60">
              회원가입하면 러닝 기록을 저장하고 나중에 확인할 수 있습니다.
            </p>
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleSignUpToSave}
                className="w-full rounded-full bg-emerald-400 px-4 py-3 text-sm font-bold text-black transition-all hover:bg-emerald-300 active:scale-95"
              >
                회원가입하고 저장하기
              </button>
              <button
                type="button"
                onClick={handleDiscardRun}
                className="w-full rounded-full bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/20 active:scale-95"
              >
                저장하지 않고 종료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
