'use client';

import { useRouter } from 'next/navigation';

type RerunRouteButtonProps = {
    pathData: { lat: number; lng: number }[];
    distanceKm: number;
};

export function RerunRouteButton({ pathData, distanceKm }: RerunRouteButtonProps) {
    const router = useRouter();

    const handleClick = () => {
        // Clear previous run data before starting new run
        localStorage.removeItem('runPath');
        localStorage.removeItem('runStats');
        localStorage.removeItem('activeRoute');

        // Store route data in sessionStorage so RunTracker can load it
        const routeData = {
            points: pathData,
            estimatedDistanceKm: distanceKm,
            name: '저장된 경로',
        };
        sessionStorage.setItem('rerunRoute', JSON.stringify(routeData));

        // Navigate to run page
        router.push('/run?rerun=true');
    };

    return (
        <button
            onClick={handleClick}
            className="mt-6 w-full rounded-full bg-emerald-400 py-3.5 text-sm font-bold text-black transition-all hover:bg-emerald-300 active:scale-95"
        >
            이 경로로 달리기
        </button>
    );
}
