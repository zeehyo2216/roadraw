import { auth } from "@/auth";
import { getRuns } from "@/app/actions/runs";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FavoriteButton } from "@/components/FavoriteButton";

export default async function HistoryPage() {
    const session = await auth();

    if (!session) {
        redirect("/auth/signin?callbackUrl=/history");
    }

    const runs = await getRuns();

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

    return (
        <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-slate-900 px-4 py-8">
            <div className="mx-auto max-w-2xl">
                <h1 className="mb-6 text-2xl font-bold text-white">러닝 기록</h1>

                {runs.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
                        <p className="text-white/60">아직 기록이 없습니다.</p>
                        <Link
                            href="/"
                            className="mt-4 inline-block rounded-full bg-emerald-400 px-6 py-2 text-sm font-semibold text-black hover:bg-emerald-300"
                        >
                            러닝 시작하기
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {runs.map((run) => (
                            <div
                                key={run.id}
                                className="relative rounded-2xl border border-white/10 bg-white/5 transition-all hover:border-emerald-400/40 hover:bg-white/10"
                            >
                                {/* Favorite Button */}
                                <div className="absolute right-3 top-3 z-10">
                                    <FavoriteButton runId={run.id} initialFavorite={run.isFavorite} />
                                </div>

                                <Link
                                    href={`/history/${run.id}`}
                                    className="block p-4"
                                >
                                    <div className="mb-2 text-xs text-white/50">
                                        {formatDate(run.createdAt)}
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <div>
                                            <div className="text-xl font-bold text-emerald-400">
                                                {run.totalDistanceKm.toFixed(2)}
                                            </div>
                                            <div className="text-[10px] uppercase text-white/40">km</div>
                                        </div>
                                        <div>
                                            <div className="text-xl font-bold text-white">
                                                {formatDuration(run.totalDurationSec)}
                                            </div>
                                            <div className="text-[10px] uppercase text-white/40">시간</div>
                                        </div>
                                        <div>
                                            <div className="text-xl font-bold text-white">
                                                {formatPace(run.avgPaceSecPerKm)}
                                            </div>
                                            <div className="text-[10px] uppercase text-white/40">페이스</div>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
