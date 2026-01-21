'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { saveRun } from '@/app/actions/runs';

export default function SavePendingPage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (status === 'loading') return;

        if (!session) {
            // Not logged in, redirect to signup
            router.push('/auth/signup?callbackUrl=/run/save-pending');
            return;
        }

        // User is logged in, try to save the pending run
        const pendingRun = localStorage.getItem('pendingRun');
        if (!pendingRun) {
            // No pending run, go to history
            router.push('/history');
            return;
        }

        const savePendingRun = async () => {
            setIsSaving(true);
            try {
                const runData = JSON.parse(pendingRun);
                const result = await saveRun(runData);

                if (result.error) {
                    setError(result.error);
                    setIsSaving(false);
                    return;
                }

                // Clear all run-related data
                localStorage.removeItem('pendingRun');
                localStorage.removeItem('activeRoute');
                localStorage.removeItem('runPath');
                localStorage.removeItem('runStats');

                // Navigate to history
                router.push('/history');
            } catch (err) {
                setError('기록 저장에 실패했습니다.');
                setIsSaving(false);
            }
        };

        savePendingRun();
    }, [session, status, router]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-slate-950 to-slate-900 px-4">
            <div className="text-center">
                {error ? (
                    <>
                        <p className="text-red-400">{error}</p>
                        <button
                            onClick={() => router.push('/')}
                            className="mt-4 rounded-full bg-white/10 px-6 py-2 text-sm text-white hover:bg-white/20"
                        >
                            홈으로 이동
                        </button>
                    </>
                ) : (
                    <>
                        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent mx-auto" />
                        <p className="text-white/60">
                            {isSaving ? '기록을 저장하는 중...' : '로그인 확인 중...'}
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
