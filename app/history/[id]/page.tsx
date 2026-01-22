import { auth } from "@/auth";
import { getRunById } from "@/app/actions/runs";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { RunDetailMap } from "@/components/RunDetailMap";
import { RerunRouteButton } from "@/components/RerunRouteButton";
import { DeleteRunButton } from "@/components/DeleteRunButton";

type Props = {
    params: Promise<{ id: string }>;
};

export default async function RunDetailPage({ params }: Props) {
    const session = await auth();

    if (!session) {
        redirect("/auth/signin");
    }

    const { id } = await params;
    const run = await getRunById(id);

    if (!run) {
        notFound();
    }

    // Format helpers
    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatPace = (secPerKm: number) => {
        const min = Math.floor(secPerKm / 60);
        const sec = Math.floor(secPerKm % 60);
        return `${min}'${sec.toString().padStart(2, '0')}"`;
    };

    const formatDuration = (totalSec: number) => {
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const pathData = run.pathData as { lat: number; lng: number }[];

    return (
        <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-slate-900">
            {/* Map */}
            <div className="h-[50vh]">
                <RunDetailMap pathData={pathData} />
            </div>

            {/* Stats */}
            <div className="px-4 py-6">
                <div className="mx-auto max-w-2xl">
                    <div className="mb-4 flex items-center justify-between">
                        <Link
                            href="/history"
                            className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white"
                        >
                            ← 기록 목록
                        </Link>
                        <DeleteRunButton runId={id} />
                    </div>

                    <div className="mb-2 text-sm text-white/50">
                        {formatDate(run.createdAt)}
                    </div>

                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <div className="rounded-xl bg-white/5 p-4 text-center">
                            <div className="text-2xl font-bold text-emerald-400">
                                {run.totalDistanceKm.toFixed(2)}
                            </div>
                            <div className="text-xs uppercase text-white/40">km</div>
                        </div>
                        <div className="rounded-xl bg-white/5 p-4 text-center">
                            <div className="text-2xl font-bold text-white">
                                {formatDuration(run.totalDurationSec)}
                            </div>
                            <div className="text-xs uppercase text-white/40">시간</div>
                        </div>
                        <div className="rounded-xl bg-white/5 p-4 text-center">
                            <div className="text-2xl font-bold text-white">
                                {formatPace(run.avgPaceSecPerKm)}
                            </div>
                            <div className="text-xs uppercase text-white/40">페이스</div>
                        </div>
                        <div className="rounded-xl bg-white/5 p-4 text-center">
                            <div className="text-2xl font-bold text-white">
                                {run.calories || '-'}
                            </div>
                            <div className="text-xs uppercase text-white/40">칼로리</div>
                        </div>
                    </div>

                    {/* Re-run button */}
                    <RerunRouteButton
                        pathData={pathData}
                        distanceKm={run.totalDistanceKm}
                    />
                </div>
            </div>
        </div>
    );
}
