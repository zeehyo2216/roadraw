'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { getUserSettings, updateUserSettings } from '@/app/actions/settings';

export default function SettingsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [isManualPace, setIsManualPace] = useState(false);
    const [manualPace, setManualPace] = useState({ min: 6, sec: 0 });
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    // Redirect if not logged in
    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin?callbackUrl=/settings');
        }
    }, [status, router]);

    // Load saved settings from DB
    useEffect(() => {
        async function loadSettings() {
            if (status !== 'authenticated') return;

            const settings = await getUserSettings();
            if (settings) {
                setIsManualPace(settings.isManualPace);
                if (settings.manualPaceSecPerKm) {
                    const min = Math.floor(settings.manualPaceSecPerKm / 60);
                    const sec = settings.manualPaceSecPerKm % 60;
                    setManualPace({ min, sec });
                }
            }
            setIsLoading(false);
        }
        loadSettings();
    }, [status]);

    const handleSave = async () => {
        setIsSaving(true);
        setSaveMessage('');

        // Convert manual pace to seconds
        const manualPaceSecPerKm = (manualPace.min * 60) + manualPace.sec;

        const result = await updateUserSettings({
            isManualPace,
            manualPaceSecPerKm: isManualPace ? manualPaceSecPerKm : null,
        });

        setIsSaving(false);

        if (result.success) {
            setSaveMessage('설정이 저장되었습니다.');
            setTimeout(() => setSaveMessage(''), 3000);
        } else {
            setSaveMessage(result.error || '저장 실패');
        }
    };

    const handleDeleteAccount = async () => {
        setIsDeleting(true);
        try {
            const res = await fetch('/api/auth/delete-account', {
                method: 'DELETE',
            });

            if (res.ok) {
                router.push('/api/auth/signout?callbackUrl=/');
            } else {
                alert('계정 삭제에 실패했습니다.');
                setIsDeleting(false);
            }
        } catch (error) {
            alert('오류가 발생했습니다.');
            setIsDeleting(false);
        }
    };

    if (status === 'loading' || isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-slate-900 px-4 py-8">
            <div className="mx-auto max-w-lg">
                <h1 className="mb-8 text-2xl font-bold text-white">계정 설정</h1>

                {/* User Info */}
                <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-4">
                        {session?.user?.image ? (
                            <img
                                src={session.user.image}
                                alt="Profile"
                                className="h-14 w-14 rounded-full object-cover"
                            />
                        ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                            </div>
                        )}
                        <div>
                            <p className="font-medium text-white">{session?.user?.name || '사용자'}</p>
                            <p className="text-sm text-white/50">{session?.user?.email}</p>
                        </div>
                    </div>
                </div>

                {/* Pace Settings */}
                <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-5">
                    <h2 className="mb-4 text-lg font-semibold text-white">평균 페이스 설정</h2>

                    <div className="space-y-4">
                        {/* Toggle */}
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-white/70">페이스 설정 방식</span>
                            <div className="flex rounded-full bg-black/30 p-1">
                                <button
                                    onClick={() => setIsManualPace(false)}
                                    className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${!isManualPace
                                        ? 'bg-emerald-400 text-black'
                                        : 'text-white/60 hover:text-white'
                                        }`}
                                >
                                    자동
                                </button>
                                <button
                                    onClick={() => setIsManualPace(true)}
                                    className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${isManualPace
                                        ? 'bg-emerald-400 text-black'
                                        : 'text-white/60 hover:text-white'
                                        }`}
                                >
                                    수동
                                </button>
                            </div>
                        </div>

                        {/* Manual Pace Input */}
                        {isManualPace && (
                            <div className="rounded-xl bg-black/20 p-4">
                                <p className="mb-3 text-xs text-white/50">1km당 평균 페이스 입력</p>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="1"
                                        max="30"
                                        value={manualPace.min}
                                        onChange={(e) => setManualPace({ ...manualPace, min: parseInt(e.target.value) || 0 })}
                                        className="w-16 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center text-white outline-none focus:border-emerald-400"
                                    />
                                    <span className="text-white/60">분</span>
                                    <input
                                        type="number"
                                        min="0"
                                        max="59"
                                        value={manualPace.sec}
                                        onChange={(e) => setManualPace({ ...manualPace, sec: parseInt(e.target.value) || 0 })}
                                        className="w-16 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center text-white outline-none focus:border-emerald-400"
                                    />
                                    <span className="text-white/60">초 / km</span>
                                </div>
                            </div>
                        )}

                        {!isManualPace && (
                            <p className="text-xs text-white/40">
                                자동 모드: 러닝 기록을 바탕으로 평균 페이스가 자동 계산됩니다.
                            </p>
                        )}
                    </div>
                </div>

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="mb-4 w-full rounded-full bg-emerald-400 py-3 text-sm font-bold text-black transition-all hover:bg-emerald-300 active:scale-95 disabled:opacity-50"
                >
                    {isSaving ? '저장 중...' : '설정 저장'}
                </button>

                {saveMessage && (
                    <p className={`mb-8 text-center text-sm ${saveMessage.includes('실패') ? 'text-red-400' : 'text-emerald-400'}`}>
                        {saveMessage}
                    </p>
                )}

                {/* Danger Zone */}
                <div className="mt-12 rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
                    <h2 className="mb-2 text-lg font-semibold text-red-400">위험 구역</h2>
                    <p className="mb-4 text-sm text-white/50">
                        계정을 삭제하면 모든 러닝 기록이 영구적으로 삭제됩니다.
                    </p>
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="rounded-full border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-all hover:bg-red-500/20"
                    >
                        회원 탈퇴
                    </button>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="mx-4 w-full max-w-sm rounded-2xl bg-slate-900 p-6 shadow-2xl">
                        <h3 className="mb-2 text-lg font-bold text-white">정말 탈퇴하시겠습니까?</h3>
                        <p className="mb-6 text-sm text-white/60">
                            모든 러닝 기록이 삭제되며, 이 작업은 되돌릴 수 없습니다.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 rounded-full bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/20 active:scale-95"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={isDeleting}
                                className="flex-1 rounded-full bg-red-500 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-red-400 active:scale-95 disabled:opacity-50"
                            >
                                {isDeleting ? '삭제 중...' : '탈퇴하기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
