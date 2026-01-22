'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type ActiveRunData = {
    pathLength: number;
    elapsedSec: number;
    distanceKm: number;
};

export function ContinueRunButton() {
    const router = useRouter();
    const [activeRun, setActiveRun] = useState<ActiveRunData | null>(null);

    useEffect(() => {
        // Check if there's an active run in localStorage
        const savedPath = localStorage.getItem('runPath');
        const savedStats = localStorage.getItem('runStats');
        const savedRoute = localStorage.getItem('activeRoute');

        if (savedPath && savedStats && savedRoute) {
            try {
                const path = JSON.parse(savedPath);
                const stats = JSON.parse(savedStats);

                // Only show if there's meaningful data
                if (path.length > 2 || stats.elapsedSec > 10) {
                    setActiveRun({
                        pathLength: path.length,
                        elapsedSec: stats.elapsedSec,
                        distanceKm: stats.distanceKm,
                    });
                }
            } catch (e) {
                console.error('Failed to parse active run data', e);
            }
        }
    }, []);

    const handleContinue = () => {
        router.push('/run/nav');
    };

    const handleDiscard = () => {
        localStorage.removeItem('runPath');
        localStorage.removeItem('runStats');
        localStorage.removeItem('activeRoute');
        setActiveRun(null);
    };

    if (!activeRun) return null;

    const formatTime = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="pointer-events-auto fixed left-4 right-4 top-20 z-50 mx-auto max-w-md sm:left-6 sm:right-6">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-orange-400/30 bg-orange-500/20 backdrop-blur-md px-4 py-3 shadow-lg">
                <div className="flex flex-col">
                    <span className="text-xs font-medium text-orange-300">진행 중인 러닝</span>
                    <span className="text-sm font-bold text-white">
                        {activeRun.distanceKm.toFixed(2)}km · {formatTime(activeRun.elapsedSec)}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDiscard}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-white/60 hover:text-white transition-colors"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleContinue}
                        className="rounded-full bg-orange-500 px-4 py-1.5 text-xs font-bold text-white shadow-md hover:bg-orange-400 transition-colors"
                    >
                        마저 달리기
                    </button>
                </div>
            </div>
        </div>
    );
}
